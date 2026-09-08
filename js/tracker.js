/* ==========================================================================
   YATRA v3 — tracker.js
   Pelacakan GPS langsung: jarak, durasi, kecepatan, elevasi, auto-pause,
   penyimpanan sementara (crash-safe), dan wake lock layar.
   ========================================================================== */
(function (global) {
  'use strict';

  var DRAFT_KEY = 'yatra_track_draft_v3';

  var Tracker = {
    active: false, paused: false,
    points: [], startedAt: 0, elapsedMs: 0, lastTick: 0,
    distanceKm: 0, elevationM: 0, maxSpeed: 0,
    watchId: null, timerId: null, wakeLock: null,
    onUpdate: null, onError: null,

    /* ------------------------------------------------------------ MULAI */
    start: function (opts) {
      if (this.active) return Promise.resolve();
      if (!navigator.geolocation) return Promise.reject(new Error('Perangkat tidak mendukung GPS.'));
      var self = this;
      this.active = true; this.paused = false;
      this.points = []; this.distanceKm = 0; this.elevationM = 0; this.maxSpeed = 0;
      this.startedAt = Date.now(); this.elapsedMs = 0; this.lastTick = Date.now();
      this.opts = opts || {};

      this.watchId = navigator.geolocation.watchPosition(
        function (pos) { self._onPos(pos); },
        function (err) { self.onError && self.onError(self._geoMsg(err)); },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
      this.timerId = setInterval(function () { self._tick(); }, 1000);
      this._requestWakeLock();
      return Promise.resolve();
    },

    pause: function () {
      if (!this.active || this.paused) return;
      this.paused = true; this._tick();
      this._emit();
    },
    resume: function () {
      if (!this.active || !this.paused) return;
      this.paused = false; this.lastTick = Date.now();
      this._emit();
    },

    /* ---------------------------------------------------------- SELESAI */
    stop: function () {
      if (this.watchId != null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
      if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
      this._releaseWakeLock();
      this.active = false; this.paused = false;
      var result = this.summary();
      this.clearDraft();
      return result;
    },

    summary: function () {
      var min = Math.round(this.elapsedMs / 60000);
      return {
        points: this.points.map(function (p) { return { lat: p.lat, lng: p.lng }; }),
        distanceKm: Math.round(this.distanceKm * 100) / 100,
        durationMin: Math.max(1, min),
        durationSec: Math.round(this.elapsedMs / 1000),
        elevationM: Math.round(this.elevationM),
        avgSpeed: this.elapsedMs > 0 ? Math.round((this.distanceKm / (this.elapsedMs / 3600000)) * 100) / 100 : 0,
        maxSpeed: Math.round(this.maxSpeed * 100) / 100,
        start: this.points[0] || null,
        end: this.points[this.points.length - 1] || null
      };
    },

    /* ---------------------------------------------------------- INTERNAL */
    _onPos: function (pos) {
      if (!this.active || this.paused) return;
      var c = pos.coords;
      var pt = { lat: c.latitude, lng: c.longitude, alt: c.altitude, acc: c.accuracy, t: pos.timestamp || Date.now() };
      var last = this.points[this.points.length - 1];

      if (!Util.filterPoint(last, pt, c.accuracy)) {
        if (!last) this.points.push(pt);
        return;
      }
      if (last) {
        var d = Util.haversine(last, pt);
        this.distanceKm += d;
        var dt = Math.max(1, (pt.t - last.t) / 1000);
        var spd = (d / dt) * 3600;
        if (spd > this.maxSpeed && spd < 60) this.maxSpeed = spd;
        if (pt.alt != null && last.alt != null) {
          var dz = pt.alt - last.alt;
          if (dz > 0.8) this.elevationM += dz;
        }
      }
      this.points.push(pt);
      this.saveDraft();
      this._emit();
    },

    _tick: function () {
      var now = Date.now();
      if (this.active && !this.paused) this.elapsedMs += now - this.lastTick;
      this.lastTick = now;
      if (this.active) this._emit();
    },

    _emit: function () {
      if (!this.onUpdate) return;
      var s = this.summary();
      s.active = this.active; s.paused = this.paused;
      s.pace = s.distanceKm > 0 ? (s.durationSec / 60) / s.distanceKm : 0;
      s.lastPoint = this.points[this.points.length - 1] || null;
      s.accuracy = s.lastPoint ? s.lastPoint.acc : null;
      this.onUpdate(s);
    },

    _geoMsg: function (err) {
      switch (err && err.code) {
        case 1: return 'Izin lokasi ditolak. Aktifkan GPS untuk aplikasi ini.';
        case 2: return 'Sinyal GPS tidak tersedia. Coba di ruang terbuka.';
        case 3: return 'Pencarian GPS terlalu lama. Menunggu sinyal...';
        default: return 'Terjadi kesalahan GPS.';
      }
    },

    /* ------------------------------------------------------- WAKE LOCK */
    _requestWakeLock: function () {
      var self = this;
      try {
        if ('wakeLock' in navigator) {
          navigator.wakeLock.request('screen').then(function (l) { self.wakeLock = l; }).catch(function () {});
        }
      } catch (e) {}
    },
    _releaseWakeLock: function () {
      try { if (this.wakeLock) { this.wakeLock.release(); this.wakeLock = null; } } catch (e) {}
    },

    /* ----------------------------------------------------------- DRAFT */
    saveDraft: function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          points: this.points.slice(-2000), distanceKm: this.distanceKm,
          elevationM: this.elevationM, elapsedMs: this.elapsedMs,
          startedAt: this.startedAt, savedAt: Date.now()
        }));
      } catch (e) {}
    },
    getDraft: function () {
      try {
        var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        if (!d || !d.points || d.points.length < 2) return null;
        if (Date.now() - d.savedAt > 12 * 3600 * 1000) { this.clearDraft(); return null; }
        return d;
      } catch (e) { return null; }
    },
    restoreDraft: function (d) {
      this.points = d.points; this.distanceKm = d.distanceKm || 0;
      this.elevationM = d.elevationM || 0; this.elapsedMs = d.elapsedMs || 0;
      this.startedAt = d.startedAt || Date.now();
      this.lastTick = Date.now(); this.active = false; this.paused = true;
      this._emit();
    },
    clearDraft: function () { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
  };

  global.Tracker = Tracker;
})(window);
