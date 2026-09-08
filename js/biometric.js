/**
 * YATRA v3 — Login Biometrik (WebAuthn / Web Authentication API)
 *
 * Cara kerja & batasannya — penting dipahami:
 *
 * WebAuthn yang sesungguhnya memerlukan server yang menyimpan public key dan
 * memverifikasi signature setiap kali login. Backend YATRA berjalan di Google
 * Apps Script yang tidak menyediakan primitif kriptografi untuk itu.
 *
 * Karena itu modul ini memakai pendekatan **kunci perangkat**:
 *   1. Saat mendaftar, browser membuat kredensial platform (sidik jari / Face
 *      ID / PIN perangkat). Kredensial itu terkunci di secure hardware HP.
 *   2. Kita menyimpan credentialId + kredensial login TERENKRIPSI di
 *      localStorage. Kunci enkripsinya diturunkan dari credentialId lewat
 *      PBKDF2 (150.000 iterasi, SHA-256) menggunakan Web Crypto.
 *   3. Saat login, sidik jari membuka kredensial tersebut, lalu dikirim ke
 *      server seperti login biasa.
 *
 * Artinya: biometrik di sini adalah **kunci akses lokal ke perangkat ini**,
 * bukan faktor autentikasi yang diverifikasi server. Ini setara dengan cara
 * kebanyakan aplikasi perbankan menyimpan "quick login" — nyaman dan jauh
 * lebih aman daripada menyimpan password polos, tetapi bukan pengganti
 * autentikasi sisi server.
 *
 * Konsekuensi yang perlu diketahui pengguna (ditampilkan di UI):
 *   • Pendaftaran berlaku per perangkat DAN per browser.
 *   • Siapa pun yang bisa membuka kunci perangkat dapat masuk sebagai Anda.
 *   • Ganti password → pendaftaran otomatis dibatalkan.
 *   • Jangan diaktifkan di perangkat bersama.
 *
 * Memerlukan HTTPS (atau localhost). Di Apps Script (iframe) WebAuthn
 * diblokir oleh browser, jadi fitur ini otomatis disembunyikan di sana.
 */
(function (global) {
  'use strict';

  var STORE = 'yatra_bio_v3';
  var LEGACY = ['yatra_bio_v1', 'yatra_bio_v2'];

  /* ------------------------------------------------------- penyimpanan */
  function read() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); }
    catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(STORE, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }
  function wipe() {
    try {
      localStorage.removeItem(STORE);
      LEGACY.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ----------------------------------------------------------- base64 */
  function b64(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }

  /* ------------------------------------------------------- kriptografi */
  function deriveKey(secret, salt) {
    var enc = new TextEncoder();
    return crypto.subtle
      .importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      });
  }

  function encrypt(plain, secret) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(secret, salt).then(function (key) {
      return crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        new TextEncoder().encode(plain)
      );
    }).then(function (ct) {
      return { salt: b64(salt), iv: b64(iv), data: b64(ct) };
    });
  }

  function decrypt(payload, secret) {
    return deriveKey(secret, unb64(payload.salt)).then(function (key) {
      return crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(payload.iv) },
        key,
        unb64(payload.data)
      );
    }).then(function (buf) {
      return new TextDecoder().decode(buf);
    });
  }

  /* ------------------------------------------------------ ketersediaan */
  var Bio = {
    /** Apakah browser & perangkat mendukung biometrik platform? */
    supported: function () {
      if (!global.PublicKeyCredential) return Promise.resolve(false);
      if (!global.isSecureContext) return Promise.resolve(false);
      if (!(global.crypto && global.crypto.subtle)) return Promise.resolve(false);
      // Di dalam iframe (Apps Script) WebAuthn diblokir browser.
      try { if (global.self !== global.top) return Promise.resolve(false); } catch (e) { return Promise.resolve(false); }
      return PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable()
        .then(function (ok) { return !!ok; })
        .catch(function () { return false; });
    },

    /** Sudah ada pendaftaran di perangkat ini? */
    enrolled: function () {
      var d = read();
      return !!(d && d.credentialId && d.payload);
    },

    /** UserID yang terdaftar (untuk ditampilkan di tombol login). */
    username: function () {
      var d = read();
      return (d && d.username) || '';
    },

    /** Nama panggilan, agar sapaan di tombol terasa personal. */
    nickname: function () {
      var d = read();
      return (d && d.nickname) || '';
    },

    /**
     * Daftarkan biometrik untuk akun ini.
     * @param {string} username
     * @param {string} password  disimpan terenkripsi, tidak pernah polos
     * @param {string} nickname
     */
    enroll: function (username, password, nickname) {
      if (!username || !password) {
        return Promise.reject(new Error('UserID dan password wajib diisi.'));
      }
      return Bio.supported().then(function (ok) {
        if (!ok) throw new Error('Perangkat atau browser ini tidak mendukung login biometrik.');

        var challenge = crypto.getRandomValues(new Uint8Array(32));
        var userId = crypto.getRandomValues(new Uint8Array(16));

        return navigator.credentials.create({
          publicKey: {
            challenge: challenge,
            rp: { name: 'YATRA', id: location.hostname },
            user: {
              id: userId,
              name: username,
              displayName: nickname || username
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },    // ES256
              { type: 'public-key', alg: -257 }   // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'none'
          }
        });
      }).then(function (cred) {
        if (!cred) throw new Error('Pendaftaran dibatalkan.');
        var credentialId = b64(cred.rawId);
        return encrypt(
          JSON.stringify({ u: username, p: password }),
          credentialId
        ).then(function (payload) {
          var saved = write({
            credentialId: credentialId,
            username: username,
            nickname: nickname || '',
            payload: payload,
            host: location.hostname,
            at: Date.now()
          });
          if (!saved) throw new Error('Gagal menyimpan data biometrik di perangkat.');
          return true;
        });
      }).catch(function (err) {
        throw new Error(friendly(err));
      });
    },

    /**
     * Verifikasi sidik jari lalu kembalikan kredensial yang tersimpan.
     * @returns {Promise<{username:string,password:string}>}
     */
    authenticate: function () {
      var d = read();
      if (!d || !d.credentialId || !d.payload) {
        return Promise.reject(new Error('Belum ada pendaftaran biometrik di perangkat ini.'));
      }
      if (d.host && d.host !== location.hostname) {
        wipe();
        return Promise.reject(new Error('Alamat situs berubah. Silakan daftarkan biometrik lagi.'));
      }

      var challenge = crypto.getRandomValues(new Uint8Array(32));

      return navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            type: 'public-key',
            id: unb64(d.credentialId),
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      }).then(function (assertion) {
        if (!assertion) throw new Error('Verifikasi dibatalkan.');
        return decrypt(d.payload, d.credentialId);
      }).then(function (json) {
        var o = JSON.parse(json);
        return { username: o.u, password: o.p };
      }).catch(function (err) {
        throw new Error(friendly(err));
      });
    },

    /** Hapus pendaftaran dari perangkat ini. */
    remove: function () { wipe(); return Promise.resolve(true); },

    /** Info ringkas untuk ditampilkan di halaman profil. */
    info: function () {
      var d = read();
      if (!d) return null;
      return {
        username: d.username,
        nickname: d.nickname,
        at: d.at ? new Date(d.at) : null
      };
    }
  };

  /** Ubah pesan error teknis WebAuthn menjadi bahasa yang dimengerti. */
  function friendly(err) {
    var name = (err && err.name) || '';
    var msg = (err && err.message) || 'Terjadi kesalahan.';

    if (name === 'NotAllowedError') {
      return 'Verifikasi dibatalkan atau melebihi batas waktu. Silakan coba lagi.';
    }
    if (name === 'InvalidStateError') {
      return 'Perangkat ini sudah pernah didaftarkan untuk akun tersebut.';
    }
    if (name === 'NotSupportedError') {
      return 'Perangkat ini tidak memiliki sensor biometrik yang didukung.';
    }
    if (name === 'SecurityError') {
      return 'Login biometrik memerlukan koneksi HTTPS yang aman.';
    }
    if (name === 'AbortError') {
      return 'Proses dibatalkan.';
    }
    return msg;
  }

  global.Bio = Bio;
})(window);
