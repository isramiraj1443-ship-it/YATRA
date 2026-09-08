/* ==========================================================================
   YATRA v3 — api.js
   Lapisan komunikasi. Mendukung dua mode:
   1) PWA / Vercel  : POST ke /api/<fn>  (serverless proxy meneruskan ke Apps Script)
   2) Apps Script   : google.script.run  (bila di-host langsung dari HtmlService)
   ========================================================================== */
(function (global) {
  'use strict';

  var API_BASE  = '/api';
  var IS_GAS    = typeof google !== 'undefined' && google.script && google.script.run;
  var TOKEN_KEY = 'yatra_token_v3';

  var Api = {
    token: '',
    online: navigator.onLine,

    /* ------------------------------------------------------------ TOKEN */
    loadToken: function () {
      try { this.token = localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { this.token = ''; }
      return this.token;
    },
    setToken: function (t) {
      this.token = t || '';
      try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    },
    clearToken: function () { this.setToken(''); },

    /* ------------------------------------------------------------- CALL */
    call: function (fn) {
      var args = Array.prototype.slice.call(arguments, 1);
      var self = this;
      if (IS_GAS) {
        return new Promise(function (resolve, reject) {
          google.script.run
            .withSuccessHandler(function (r) { resolve(self._normalize(r)); })
            .withFailureHandler(function (e) { reject(new Error((e && e.message) || 'Gagal menghubungi server.')); })
            [fn].apply(null, [self.token].concat(args));
        });
      }
      return fetch(API_BASE + '/' + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fn: fn, token: self.token, args: args })
      }).then(function (res) {
        if (!res.ok) throw new Error('Server merespons ' + res.status);
        return res.json();
      }).then(function (data) {
        var d = self._normalize(data);
        if (d && d.ok === false && /sesi/i.test(d.error || '')) {
          self.clearToken();
          global.dispatchEvent(new CustomEvent('yatra:session-expired'));
        }
        return d;
      }).catch(function (err) {
        if (!navigator.onLine) throw new Error('Tidak ada koneksi internet. Data disimpan sementara di perangkat.');
        throw new Error((err && err.message) || 'Gagal menghubungi server.');
      });
    },

    /** Panggil dan lempar error bila server mengembalikan ok:false. */
    must: function () {
      return this.call.apply(this, arguments).then(function (r) {
        if (r && r.ok === false) throw new Error(r.error || 'Permintaan gagal.');
        return r;
      });
    },

    _normalize: function (r) {
      if (r === undefined || r === null) return { ok: true };
      if (Array.isArray(r)) return { ok: true, items: r };
      if (typeof r !== 'object') return { ok: true, value: r };
      if (r.ok === undefined) r.ok = true;
      return r;
    },

    /* --------------------------------------------------- ANTREAN OFFLINE */
    QUEUE_KEY: 'yatra_queue_v3',
    queue: function (fn, args) {
      var q = this.getQueue();
      q.push({ fn: fn, args: args, at: Date.now() });
      try { localStorage.setItem(this.QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
      return q.length;
    },
    getQueue: function () {
      try { return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]'); } catch (e) { return []; }
    },
    clearQueue: function () { try { localStorage.removeItem(this.QUEUE_KEY); } catch (e) {} },

    /** Kirim ulang semua data yang tertunda saat kembali online. */
    flushQueue: function () {
      var q = this.getQueue(), self = this;
      if (!q.length) return Promise.resolve({ sent: 0 });
      var sent = 0, failed = [];
      return q.reduce(function (chain, job) {
        return chain.then(function () {
          return self.call.apply(self, [job.fn].concat(job.args))
            .then(function (r) { r && r.ok !== false ? sent++ : failed.push(job); })
            .catch(function () { failed.push(job); });
        });
      }, Promise.resolve()).then(function () {
        try { localStorage.setItem(self.QUEUE_KEY, JSON.stringify(failed)); } catch (e) {}
        return { sent: sent, pending: failed.length };
      });
    },

    /* ---------------------------------------------------- CACHE RINGAN */
    cacheSet: function (key, data, ttlSec) {
      try { localStorage.setItem('yc_' + key, JSON.stringify({ t: Date.now(), ttl: (ttlSec || 300) * 1000, d: data })); } catch (e) {}
    },
    cacheGet: function (key) {
      try {
        var raw = JSON.parse(localStorage.getItem('yc_' + key) || 'null');
        if (!raw) return null;
        if (Date.now() - raw.t > raw.ttl) return null;
        return raw.d;
      } catch (e) { return null; }
    },
    cacheClear: function () {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('yc_') === 0) localStorage.removeItem(k); });
      } catch (e) {}
    }
  };

  global.addEventListener('online',  function () { Api.online = true;  Api.flushQueue(); });
  global.addEventListener('offline', function () { Api.online = false; });

  global.Api = Api;
})(window);
