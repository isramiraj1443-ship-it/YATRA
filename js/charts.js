/* ==========================================================================
   YATRA v3 — charts.js
   Grafik ringan berbasis Canvas (tanpa pustaka eksternal, aman untuk PWA).
   ========================================================================== */
(function (global) {
  'use strict';

  function css(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function prep(canvas) {
    var dpr = global.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.clientWidth || 320;
    var h = rect.height || 180;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  var Charts = {
    /** Grafik batang mingguan: data = [{label, km}] */
    bars: function (canvas, data, opts) {
      if (!canvas || !data) return;
      opts = opts || {};
      var p = prep(canvas), ctx = p.ctx, w = p.w, h = p.h;
      var padL = 6, padR = 6, padT = 16, padB = 24;
      var max = Math.max.apply(null, data.map(function (d) { return d.km || 0; }).concat([1]));
      var n = data.length || 1;
      var gap = 8;
      var bw = Math.max(6, (w - padL - padR - gap * (n - 1)) / n);
      var brand = css('--brand', '#fc4c02'), brand2 = css('--brand-2', '#ff8a3d');
      var muted = css('--muted', '#8b94a4'), line = css('--line', '#2a303b');

      // garis bantu
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      [0, 0.5, 1].forEach(function (f) {
        var y = padT + (h - padT - padB) * f;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      });

      data.forEach(function (d, i) {
        var val = d.km || 0;
        var bh = Math.max(2, (val / max) * (h - padT - padB));
        var x = padL + i * (bw + gap), y = h - padB - bh;
        var g = ctx.createLinearGradient(0, y, 0, y + bh);
        g.addColorStop(0, brand2); g.addColorStop(1, brand);
        ctx.fillStyle = val > 0 ? g : line;
        var r = Math.min(6, bw / 2);
        ctx.beginPath();
        ctx.moveTo(x, y + bh); ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + bw - r, y);
        ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
        ctx.lineTo(x + bw, y + bh);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = muted;
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label || '', x + bw / 2, h - 8);
        if (val > 0) {
          ctx.fillStyle = css('--text', '#fff');
          ctx.font = '800 10px system-ui, sans-serif';
          ctx.fillText(Math.round(val * 10) / 10, x + bw / 2, y - 5);
        }
      });
      if (opts.unit) {
        ctx.fillStyle = muted; ctx.textAlign = 'left';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillText(opts.unit, padL, 10);
      }
    },

    /** Grafik garis halus: data = [{label, value}] */
    line: function (canvas, data) {
      if (!canvas || !data || !data.length) return;
      var p = prep(canvas), ctx = p.ctx, w = p.w, h = p.h;
      var padL = 8, padR = 8, padT = 14, padB = 22;
      var max = Math.max.apply(null, data.map(function (d) { return d.value || 0; }).concat([1]));
      var step = (w - padL - padR) / Math.max(1, data.length - 1);
      var brand = css('--brand', '#fc4c02');
      var pts = data.map(function (d, i) {
        return { x: padL + i * step, y: padT + (1 - (d.value || 0) / max) * (h - padT - padB) };
      });

      ctx.beginPath();
      pts.forEach(function (pt, i) {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else {
          var prev = pts[i - 1], cx = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
        }
      });
      ctx.strokeStyle = brand; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();

      ctx.lineTo(pts[pts.length - 1].x, h - padB);
      ctx.lineTo(pts[0].x, h - padB);
      ctx.closePath();
      var g = ctx.createLinearGradient(0, padT, 0, h - padB);
      g.addColorStop(0, 'rgba(252,76,2,.30)'); g.addColorStop(1, 'rgba(252,76,2,0)');
      ctx.fillStyle = g; ctx.fill();

      ctx.fillStyle = brand;
      pts.forEach(function (pt) { ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2); ctx.fill(); });
    },

    /** Donat komposisi jenis kegiatan: data = [{label, value, color}] */
    donut: function (canvas, data) {
      if (!canvas || !data || !data.length) return;
      var p = prep(canvas), ctx = p.ctx, w = p.w, h = p.h;
      var total = data.reduce(function (s, d) { return s + (d.value || 0); }, 0) || 1;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6, r = R * 0.62;
      var start = -Math.PI / 2;
      var palette = ['#fc4c02', '#ff8a3d', '#f4b400', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#94a3b8'];
      data.forEach(function (d, i) {
        var ang = (d.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, start, start + ang);
        ctx.arc(cx, cy, r, start + ang, start, true);
        ctx.closePath();
        ctx.fillStyle = d.color || palette[i % palette.length];
        ctx.fill();
        start += ang;
      });
      ctx.fillStyle = css('--text', '#fff');
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(total), cx, cy);
    }
  };

  global.Charts = Charts;
})(window);
