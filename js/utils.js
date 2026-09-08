/* ==========================================================================
   YATRA v3 — utils.js : format, DOM, toast, kompresi gambar, GPX, geo
   ========================================================================== */
(function (global) {
  'use strict';

  var Util = {
    /* ------------------------------------------------------------- DOM */
    $:  function (s, r) { return (r || document).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    el: function (id) { return document.getElementById(id); },
    val: function (id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; },
    setVal: function (id, v) { var e = document.getElementById(id); if (e) e.value = v == null ? '' : v; },
    html: function (id, h) { var e = document.getElementById(id); if (e) e.innerHTML = h; },
    show: function (id, on) { var e = document.getElementById(id); if (e) e.classList.toggle('hidden', !on); },

    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },

    /* ---------------------------------------------------------- FORMAT */
    num: function (n, d) {
      return (n == null || isNaN(n) ? 0 : Number(n)).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 2 : d });
    },
    km: function (n) { return Util.num(n, 2) + ' km'; },
    dur: function (min) {
      min = Math.round(min || 0);
      var h = Math.floor(min / 60), m = min % 60;
      return h > 0 ? (h + ' jam ' + m + ' mnt') : (m + ' mnt');
    },
    clock: function (sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return (h > 0 ? h + ':' : '') + p(m) + ':' + p(s);
    },
    pace: function (p) {
      if (!p || p <= 0) return '—';
      var m = Math.floor(p), s = Math.round((p - m) * 60);
      if (s === 60) { m++; s = 0; }
      return m + '\u2019' + (s < 10 ? '0' : '') + s + '"';
    },
    today: function () {
      var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    },
    dateID: function (s) {
      if (!s) return '';
      var d = new Date(String(s).slice(0, 10) + 'T00:00:00');
      if (isNaN(d)) return s;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    relative: function (s) {
      if (!s) return '';
      var d = new Date(String(s).slice(0, 10) + 'T00:00:00');
      var diff = Math.floor((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000);
      if (diff === 0) return 'Hari ini';
      if (diff === 1) return 'Kemarin';
      if (diff < 7) return diff + ' hari lalu';
      return Util.dateID(s);
    },
    cap: function (s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); },
    initials: function (name) {
      return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    },

    /* ----------------------------------------------------------- TOAST */
    toast: function (msg, type, ms) {
      var box = document.getElementById('toast');
      if (!box) return;
      var t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(function () {
        t.style.opacity = '0';
        t.style.transition = 'opacity .3s';
        setTimeout(function () { t.remove(); }, 320);
      }, ms || 2800);
    },
    ok:   function (m) { Util.toast(m, 'ok'); },
    err:  function (m) { Util.toast(m, 'err', 3800); },
    warn: function (m) { Util.toast(m, 'warn', 3200); },

    /* -------------------------------------------------- KOMPRESI GAMBAR */
    /** Kompres file gambar menjadi data URI JPEG < maxKB (default 195 KB). */
    compressImage: function (file, maxKB, maxDim) {
      maxKB = maxKB || 195; maxDim = maxDim || 1280;
      return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) return reject(new Error('Berkas bukan gambar.'));
        var reader = new FileReader();
        reader.onerror = function () { reject(new Error('Gagal membaca berkas.')); };
        reader.onload = function (e) {
          var img = new Image();
          img.onerror = function () { reject(new Error('Gambar tidak dapat dibaca.')); };
          img.onload = function () {
            var w = img.width, h = img.height;
            if (Math.max(w, h) > maxDim) {
              var r = maxDim / Math.max(w, h);
              w = Math.round(w * r); h = Math.round(h * r);
            }
            var cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            var q = 0.86, out = cv.toDataURL('image/jpeg', q);
            var size = function (d) { return Math.round((d.length - d.indexOf(',') - 1) * 0.75 / 1024); };
            var guard = 0;
            while (size(out) > maxKB && guard++ < 12) {
              q -= 0.08;
              if (q < 0.32) {
                cv.width = Math.round(cv.width * 0.85); cv.height = Math.round(cv.height * 0.85);
                ctx.drawImage(img, 0, 0, cv.width, cv.height);
                q = 0.7;
              }
              out = cv.toDataURL('image/jpeg', q);
            }
            resolve({ data: out, sizeKB: size(out), width: cv.width, height: cv.height });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    /* ------------------------------------------------------------- GEO */
    haversine: function (a, b) {
      var R = 6371, toRad = function (x) { return x * Math.PI / 180; };
      var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
      var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(s));
    },
    /** Total jarak (km) dari array titik. */
    pathDistance: function (pts) {
      var d = 0;
      for (var i = 1; i < pts.length; i++) d += Util.haversine(pts[i - 1], pts[i]);
      return d;
    },
    /** Buang titik GPS dengan akurasi buruk / lompatan tidak wajar. */
    filterPoint: function (last, pt, accuracy) {
      if (accuracy != null && accuracy > 35) return false;
      if (!last) return true;
      var d = Util.haversine(last, pt);
      var dt = Math.max(1, ((pt.t || Date.now()) - (last.t || Date.now())) / 1000);
      if (d < 0.0025) return false;              // < 2.5 m: derau GPS
      if ((d / dt) * 3600 > 45) return false;    // > 45 km/jam untuk mode jalan/lari: lompatan
      return true;
    },

    /* ------------------------------------------------------------- GPX */
    parseGPX: function (text) {
      var doc = new DOMParser().parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) throw new Error('Berkas GPX tidak valid.');
      var nodes = Array.prototype.slice.call(doc.getElementsByTagName('trkpt'));
      if (!nodes.length) nodes = Array.prototype.slice.call(doc.getElementsByTagName('rtept'));
      if (!nodes.length) throw new Error('GPX tidak berisi titik rute.');
      var pts = nodes.map(function (n) {
        var ele = n.getElementsByTagName('ele')[0], t = n.getElementsByTagName('time')[0];
        return {
          lat: parseFloat(n.getAttribute('lat')),
          lng: parseFloat(n.getAttribute('lon')),
          ele: ele ? parseFloat(ele.textContent) : null,
          t:   t ? new Date(t.textContent).getTime() : null
        };
      }).filter(function (p) { return !isNaN(p.lat) && !isNaN(p.lng); });

      var dist = Util.pathDistance(pts);
      var gain = 0;
      for (var i = 1; i < pts.length; i++) {
        if (pts[i].ele != null && pts[i - 1].ele != null) {
          var d = pts[i].ele - pts[i - 1].ele;
          if (d > 0.7) gain += d;
        }
      }
      var times = pts.filter(function (p) { return p.t; });
      var minutes = times.length >= 2 ? Math.round((times[times.length - 1].t - times[0].t) / 60000) : 0;
      var nameEl = doc.getElementsByTagName('name')[0];
      return {
        points: pts, distanceKm: Math.round(dist * 100) / 100,
        durationMin: minutes, elevationM: Math.round(gain),
        date: times.length ? new Date(times[0].t).toISOString().slice(0, 10) : Util.today(),
        name: nameEl ? nameEl.textContent.trim() : ''
      };
    },

    /* ------------------------------------------------------------ MISC */
    debounce: function (fn, ms) {
      var t;
      return function () {
        var a = arguments, c = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(c, a); }, ms || 300);
      };
    },
    download: function (dataUrl, filename) {
      var a = document.createElement('a');
      a.href = dataUrl; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    },
    confirm: function (message, title) {
      return new Promise(function (resolve) {
        var ovl = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title || 'Konfirmasi';
        document.getElementById('confirmBody').textContent = message;
        ovl.classList.add('show');
        var done = function (v) {
          ovl.classList.remove('show');
          document.getElementById('confirmYes').onclick = null;
          document.getElementById('confirmNo').onclick = null;
          resolve(v);
        };
        document.getElementById('confirmYes').onclick = function () { done(true); };
        document.getElementById('confirmNo').onclick  = function () { done(false); };
      });
    },
    vibrate: function (p) { try { navigator.vibrate && navigator.vibrate(p || 15); } catch (e) {} }
  };

  global.Util = Util;
})(window);
