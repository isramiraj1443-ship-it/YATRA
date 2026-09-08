/* ==========================================================================
   YATRA v3 — app.js : state, routing, dan seluruh tampilan
   ========================================================================== */
(function (global) {
  'use strict';

  var $ = Util.el, esc = Util.esc;

  var S = {
    user: null, init: null, types: [], regus: [], badges: [],
    dashboard: null, activities: [], range: 'this_month', view: 'home',
    photos: [], profilePhoto: null, trackResult: null, skk: null, sku: null,
    theme: localStorage.getItem('yatra_theme') || 'dark'
  };
  global.S = S;

  /* ================================================================ TEMA */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
    var b = $('themeBtn'); if (b) b.textContent = S.theme === 'dark' ? '🌙' : '☀️';
  }
  function toggleTheme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('yatra_theme', S.theme);
    applyTheme();
    if (S.dashboard) drawCharts();
  }

  /* =============================================================== LOGIN */
  function doLogin(cred) {
    var u = (cred && cred.username) || Util.val('l-user');
    var p = (cred && cred.password) || Util.val('l-pass');
    if (!u || !p) return Util.warn('UserID dan password wajib diisi.');
    var btn = $('loginBtn');
    btn.disabled = true; btn.textContent = 'Memproses…';
    return Api.call('gsLogin', u, p).then(function (r) {
      if (!r.ok) throw new Error(r.error || 'Login gagal.');
      Api.setToken(r.token);
      S.user = r.user;
      Util.ok('Selamat datang, ' + (r.user.nickname || r.user.name || r.user.username) + '!');
      return boot();
    }).catch(function (e) {
      Util.err(e.message);
    }).then(function () {
      btn.disabled = false; btn.textContent = 'Masuk';
    });
  }

  function doLogout() {
    Util.confirm('Keluar dari akun ini?', 'Konfirmasi Keluar').then(function (yes) {
      if (!yes) return;
      Api.call('gsLogout').catch(function () {});
      Api.clearToken(); Api.cacheClear();
      S.user = null;
      $('app').classList.add('hidden');
      $('login-view').classList.remove('hidden');
      Util.setVal('l-pass', '');
      refreshBioLogin();
    });
  }

  /* ========================================================= PASSWORD UI */
  /** Tombol mata: tampilkan / sembunyikan isi field password. */
  function togglePass(btn) {
    var input = $(btn.getAttribute('data-target'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', (show ? 'Sembunyikan' : 'Tampilkan') + ' password');
    btn.innerHTML = show
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>' +
        '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>' +
        '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>' +
        '<line x1="1" y1="1" x2="23" y2="23"></line></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
        '<circle cx="12" cy="12" r="3"></circle></svg>';
    // Kembalikan fokus supaya alur pengetikan tidak terputus.
    try { input.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ============================================================ BIOMETRIK */
  /** Tampilkan tombol "Masuk dengan Biometrik" bila perangkat sudah terdaftar. */
  function refreshBioLogin() {
    var wrap = $('bioLoginWrap');
    if (!wrap || !global.Bio) return;
    Bio.supported().then(function (ok) {
      if (!ok || !Bio.enrolled()) { wrap.classList.add('hidden'); return; }
      var who = Bio.nickname() || Bio.username();
      $('bioLoginLabel').textContent = who ? 'Masuk sebagai ' + who : 'Masuk dengan Biometrik';
      wrap.classList.remove('hidden');
      // Isikan UserID agar jelas akun mana yang akan dipakai.
      if (!Util.val('l-user')) Util.setVal('l-user', Bio.username());
    });
  }

  function doBioLogin() {
    var btn = $('bioLoginBtn');
    btn.disabled = true;
    var label = $('bioLoginLabel'), original = label.textContent;
    label.textContent = 'Memverifikasi…';

    Bio.authenticate().then(function (cred) {
      label.textContent = 'Masuk…';
      return doLogin(cred);
    }).catch(function (e) {
      Util.err(e.message);
    }).then(function () {
      btn.disabled = false; label.textContent = original;
    });
  }

  /** Perbarui kartu biometrik di halaman Profil. */
  function refreshBioCard() {
    var card = $('bioCard');
    if (!card || !global.Bio) return;
    var box = $('bioStatus'), txt = $('bioStatusText');
    var form = $('bioEnrollForm'), rm = $('bioRemoveWrap');

    Bio.supported().then(function (ok) {
      if (!ok) {
        box.classList.remove('on');
        txt.innerHTML = 'Perangkat atau browser ini <b>tidak mendukung</b> login biometrik. ' +
                        'Fitur ini memerlukan HTTPS serta sensor sidik jari / Face ID.';
        form.classList.add('hidden'); rm.classList.add('hidden');
        return;
      }
      var info = Bio.info();
      if (info && Bio.enrolled()) {
        var same = S.user && info.username === S.user.username;
        box.classList.add('on');
        txt.innerHTML = same
          ? 'Biometrik <b>aktif</b> di perangkat ini untuk akun <b>' + Util.esc(info.username) + '</b>.'
          : 'Perangkat ini terdaftar untuk akun lain (<b>' + Util.esc(info.username) + '</b>). ' +
            'Hapus dahulu bila ingin mendaftarkan akun Anda.';
        form.classList.toggle('hidden', same);
        rm.classList.remove('hidden');
      } else {
        box.classList.remove('on');
        txt.textContent = 'Biometrik belum diaktifkan di perangkat ini.';
        form.classList.remove('hidden'); rm.classList.add('hidden');
      }
    });
  }

  function bioEnroll() {
    var pass = Util.val('p-bio-pass');
    if (!pass) return Util.warn('Masukkan password Anda terlebih dahulu.');
    if (!S.user) return Util.warn('Sesi tidak ditemukan. Silakan masuk kembali.');

    // Pastikan password benar SEBELUM disimpan, agar tidak menyimpan
    // kredensial salah yang baru ketahuan gagal saat login berikutnya.
    Api.call('gsLogin', S.user.username, pass).then(function (r) {
      if (!r.ok) throw new Error('Password salah. Pendaftaran dibatalkan.');
      return Bio.enroll(S.user.username, pass, S.user.nickname || S.user.name);
    }).then(function () {
      Util.setVal('p-bio-pass', '');
      Util.ok('Biometrik berhasil didaftarkan di perangkat ini.');
      Util.vibrate(30);
      refreshBioCard();
    }).catch(function (e) { Util.err(e.message); });
  }

  function bioRemove() {
    Util.confirm(
      'Hapus pendaftaran biometrik dari perangkat ini? Anda tetap dapat masuk memakai password.',
      'Hapus Biometrik'
    ).then(function (yes) {
      if (!yes) return;
      Bio.remove().then(function () {
        Util.ok('Pendaftaran biometrik dihapus.');
        refreshBioCard();
      });
    });
  }

  /* ================================================================ BOOT */
  function boot() {
    $('login-view').classList.add('hidden');
    $('app').classList.remove('hidden');
    return Api.call('gsInitData').then(function (r) {
      if (!r.ok) throw new Error(r.error || 'Gagal memuat data.');
      S.init = r; S.user = r.user; S.types = r.types || []; S.regus = r.regus || []; S.badges = r.badges || [];
      renderHeader();
      fillTypeSelects();
      if (!r.profileComplete) {
        Util.warn('Lengkapi profil Anda terlebih dahulu.');
        go('profile');
      } else {
        go('home');
      }
      Api.flushQueue().then(function (q) { if (q.sent) Util.ok(q.sent + ' data tertunda berhasil dikirim.'); });
    }).catch(function (e) {
      Util.err(e.message);
      Api.clearToken();
      $('app').classList.add('hidden');
      $('login-view').classList.remove('hidden');
    });
  }

  function renderHeader() {
    var u = S.user || {};
    $('hdrTitle').textContent = 'YATRA';
    $('hdrSub').textContent = (S.init && S.init.app ? S.init.app.pangkalan : 'Dewan Penggalang');
    var av = $('avatar');
    if (u.profilePhotoId) {
      av.outerHTML = '<img id="avatar" class="avatar" src="' + esc(thumb(u.profilePhotoId, 200)) + '" onclick="YATRA.go(\'profile\')" alt="profil">';
    } else {
      av.outerHTML = '<div id="avatar" class="avatar" onclick="YATRA.go(\'profile\')">' + esc(Util.initials(u.nickname || u.name || u.username)) + '</div>';
    }
    Util.show('adminNav', u.role === 'admin' || u.role === 'pembina');
  }
  function thumb(id, w) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (w || 400); }

  /* ============================================================== ROUTING */
  var VIEWS = ['home', 'track', 'add', 'feed', 'skk', 'sku', 'stat', 'board', 'profile', 'admin', 'card'];
  function go(view) {
    if (VIEWS.indexOf(view) < 0) view = 'home';
    S.view = view;
    VIEWS.forEach(function (v) { Util.show('view-' + v, v === view); });
    Util.$$('nav.bottom button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var loaders = { home: loadHome, feed: loadFeed, skk: loadSkk, sku: loadSku,
      stat: loadStat, board: loadBoard, profile: loadProfile, admin: loadAdmin, card: loadCard };
    if (loaders[view]) loaders[view]();
  }

  /* ============================================================== BERANDA */
  function loadHome() {
    var cached = Api.cacheGet('dash_' + S.range);
    if (cached) renderHome(cached);
    else $('homeBody').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton" style="height:120px"></div>';
    Api.call('gsDashboard', S.range).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.dashboard = r;
      Api.cacheSet('dash_' + S.range, r, 120);
      renderHome(r);
      if (r.newBadges && r.newBadges.length) celebrate(r.newBadges);
    }).catch(function (e) { Util.err(e.message); });
  }

  function renderHome(d) {
    S.dashboard = d;
    var u = d.user || S.user, st = d.stats || {}, lv = d.level || {};
    var greet = new Date().getHours() < 11 ? 'Selamat pagi' : (new Date().getHours() < 15 ? 'Selamat siang' : (new Date().getHours() < 18 ? 'Selamat sore' : 'Selamat malam'));

    var ann = (d.announcements || []).slice(0, 2).map(function (a) {
      return '<div class="card card-flat" style="border-left:3px solid var(--info)">' +
        '<div class="row spread"><b>📢 ' + esc(a.title) + '</b><span class="small muted">' + esc(a.createdAt || '') + '</span></div>' +
        '<div class="small muted mt">' + esc(a.body) + '</div></div>';
    }).join('');

    var h = ''
      + ann
      + '<div class="row spread mb">'
      +   '<div><div class="small muted">' + greet + ',</div>'
      +   '<div style="font-size:21px;font-weight:900;letter-spacing:-.5px">' + esc(u.nickname || u.name || u.username) + '</div></div>'
      +   '<div class="chip">' + (lv.title ? '⭐ ' + esc(lv.title) : '') + '</div>'
      + '</div>'

      + '<div class="card card-flat" style="padding:12px">'
      +   '<div class="row spread small"><span class="muted">Level ' + (lv.level || 1) + ' • ' + Util.num(lv.xp, 0) + ' XP</span>'
      +   '<span class="muted">' + Util.num(lv.nextAt, 0) + ' XP</span></div>'
      +   '<div class="bar mt" style="height:7px"><i style="width:' + (lv.pct || 0) + '%"></i></div>'
      + '</div>'

      + '<div class="grid2 mb">'
      +   '<button class="btn btn-primary" onclick="YATRA.go(\'track\')">🥾 Lacak Rute</button>'
      +   '<button class="btn btn-ghost" onclick="YATRA.go(\'add\')">✍️ Catat Manual</button>'
      + '</div>'
      + '<div class="grid3 mb">'
      +   '<button class="btn btn-ghost btn-sm" onclick="YATRA.go(\'sku\')">📋 SKU</button>'
      +   '<button class="btn btn-ghost btn-sm" onclick="YATRA.go(\'stat\')">📊 Statistik</button>'
      +   '<button class="btn btn-ghost btn-sm" onclick="YATRA.go(\'card\')">🏅 Kartu</button>'
      + '</div>'
      + tabsHTML()

      + '<div class="hero-stat">'
      +   '<div class="lbl">Total Jarak ' + rangeLabel(S.range) + '</div>'
      +   '<div><span class="big">' + Util.num(st.totalDistance, 2) + '</span> <span class="unit">km</span></div>'
      +   '<div class="hero-sub">'
      +     '<div><span class="v">' + (st.count || 0) + '</span><span class="l">perjalanan</span></div>'
      +     '<div><span class="v">' + Util.dur(st.totalDuration) + '</span><span class="l">durasi</span></div>'
      +     '<div><span class="v">' + Util.num(st.avgSpeed, 1) + '</span><span class="l">km/jam</span></div>'
      +   '</div>'
      + '</div>'

      + targetHTML(d.target)

      + '<div class="stat-grid">'
      +   statBox('🔥', st.streak || 0, 'hari beruntun')
      +   statBox('⛰️', Util.num(st.totalElevation, 0), 'meter elevasi')
      +   statBox('🔋', Util.num(st.totalCalories, 0), 'kalori')
      +   statBox('📆', st.activeDays || 0, 'hari aktif')
      + '</div>'

      + skkCardHTML(d.skk)
      + badgeStripHTML(d.badges)

      + '<div class="section-title">Grafik 8 Pekan</div>'
      + '<div class="card"><canvas id="trendChart" class="chart"></canvas></div>'

      + '<div class="section-title">Perjalanan Terakhir</div>'
      + (d.recent && d.recent.length ? d.recent.map(activityItem).join('')
         : '<div class="empty"><div class="ic">🥾</div>Belum ada perjalanan.<br><button class="btn btn-primary btn-sm mt" onclick="YATRA.go(\'track\')">Mulai Lacak</button></div>');

    $('homeBody').innerHTML = h;
    drawCharts();
  }

  function statBox(ic, v, l) {
    return '<div class="stat-box"><div class="ic">' + ic + '</div><div class="v">' + v + '</div><div class="l">' + l + '</div></div>';
  }
  function tabsHTML() {
    var opts = [['this_week', 'Pekan'], ['this_month', 'Bulan'], ['this_year', 'Tahun'], ['all', 'Semua']];
    return '<div class="tabs">' + opts.map(function (o) {
      return '<button class="' + (S.range === o[0] ? 'active' : '') + '" onclick="YATRA.setRange(\'' + o[0] + '\')">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function rangeLabel(r) {
    return { this_week: 'Pekan Ini', this_month: 'Bulan Ini', this_year: 'Tahun Ini', all: 'Keseluruhan' }[r] || '';
  }
  function setRange(r) { S.range = r; loadHome(); }

  function targetHTML(t) {
    if (!t) return '';
    if (!t.targetKm) {
      return '<div class="card card-flat"><div class="row spread"><span class="small muted">Belum ada target bulanan</span>'
        + '<button class="btn btn-xs btn-ghost" onclick="YATRA.go(\'stat\')">Atur Target</button></div></div>';
    }
    return '<div class="card"><div class="row" style="gap:14px">'
      + '<div class="ring" style="--p:' + t.pct + '"><span>' + t.pct + '%</span></div>'
      + '<div class="grow"><div class="small muted">Target Bulanan</div>'
      + '<div style="font-weight:900;font-size:18px">' + Util.num(t.distance, 1) + ' / ' + Util.num(t.targetKm, 0) + ' km</div>'
      + '<div class="bar mt"><i style="width:' + t.pct + '%"></i></div></div></div></div>';
  }

  function skkCardHTML(skk) {
    if (!skk || !skk.levels || !skk.levels.length) return '';
    var next = skk.levels.filter(function (l) { return !l.reached; })[0] || skk.levels[skk.levels.length - 1];
    return '<div class="card" onclick="YATRA.go(\'skk\')" style="cursor:pointer">'
      + '<div class="row spread"><b>🎗️ SKK Gerak Jalan</b>'
      + '<span class="pill ' + (skk.validatedLevel ? 'pill-ok' : 'pill-muted') + '">'
      + (skk.validatedLabel || 'Belum tervalidasi') + '</span></div>'
      + '<div class="small muted mt">Menuju ' + esc(next.label) + ' — ' + next.trips + '/' + next.minTrips
      + ' perjalanan ≥ ' + next.distanceKm + ' km</div>'
      + '<div class="bar mt' + (next.reached ? ' ok' : '') + '"><i style="width:' + next.pct + '%"></i></div></div>';
  }

  function badgeStripHTML(badges) {
    if (!badges || !badges.length) return '';
    return '<div class="section-title">Lencana Terbaru</div><div class="card"><div class="row" style="gap:14px;overflow-x:auto">'
      + badges.map(function (b) {
          return '<div class="center" style="flex:none;width:66px"><div style="font-size:30px">' + b.icon + '</div>'
            + '<div class="small" style="font-weight:700;line-height:1.2">' + esc(b.name) + '</div></div>';
        }).join('')
      + '<button class="btn btn-xs btn-ghost" style="flex:none" onclick="YATRA.go(\'stat\')">Semua</button></div></div>';
  }

  function drawCharts() {
    if (!S.dashboard) return;
    var c = $('trendChart');
    if (c) Charts.bars(c, (S.dashboard.trend || []).map(function (t) { return { label: t.label, km: t.km }; }), { unit: 'km' });
    var d = $('typeChart');
    if (d && S.dashboard.stats && S.dashboard.stats.byType) {
      var bt = S.dashboard.stats.byType;
      Charts.donut(d, Object.keys(bt).map(function (k) { return { label: typeInfo(k).label, value: bt[k] }; }));
    }
  }

  function celebrate(badges) {
    openSheet('🎉 Lencana Baru!',
      '<div class="center">' + badges.map(function (b) {
        return '<div style="margin:14px 0"><div style="font-size:56px">' + b.icon + '</div>'
          + '<div style="font-weight:900;font-size:18px">' + esc(b.name) + '</div>'
          + '<div class="small muted">' + esc(b.desc) + '</div></div>';
      }).join('') + '<button class="btn btn-primary btn-block mt" onclick="YATRA.closeSheet()">Luar Biasa!</button></div>');
    Util.vibrate([40, 60, 40]);
  }

  /* ============================================================== RIWAYAT */
  function loadFeed() {
    $('feedList').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    Api.call('gsListActivities', { range: $('feedRange') ? $('feedRange').value : 'all' }).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.activities = r.items || [];
      renderFeed(S.activities);
    }).catch(function (e) { Util.err(e.message); $('feedList').innerHTML = ''; });
  }
  function renderFeed(list) {
    if (!list.length) {
      $('feedList').innerHTML = '<div class="empty"><div class="ic">📖</div>Belum ada catatan perjalanan.</div>';
      return;
    }
    var byMonth = {};
    list.forEach(function (a) {
      var k = (a.date || '').slice(0, 7);
      (byMonth[k] = byMonth[k] || []).push(a);
    });
    $('feedList').innerHTML = Object.keys(byMonth).sort().reverse().map(function (k) {
      var km = byMonth[k].reduce(function (s, a) { return s + (a.distanceKm || 0); }, 0);
      var label = new Date(k + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return '<div class="section-title">' + esc(label) + ' • ' + Util.num(km, 1) + ' km</div>'
        + byMonth[k].map(activityItem).join('');
    }).join('');
  }
  function searchFeed() {
    var q = Util.val('feedSearch').toLowerCase();
    renderFeed(!q ? S.activities : S.activities.filter(function (a) {
      return (a.title + ' ' + a.location + ' ' + a.notes).toLowerCase().indexOf(q) >= 0;
    }));
  }

  function typeInfo(k) {
    for (var i = 0; i < S.types.length; i++) if (S.types[i].key === k) return S.types[i];
    return { label: k || 'Kegiatan', icon: '🏅' };
  }
  function activityItem(a) {
    var t = typeInfo(a.type);
    return '<div class="item" onclick="YATRA.openActivity(\'' + a.id + '\')">'
      + '<div class="ic">' + t.icon + '</div>'
      + '<div class="grow" style="min-width:0">'
      +   '<div class="tt">' + esc(a.title || t.label) + (a.verified ? ' <span class="pill pill-ok">✓</span>' : '') + '</div>'
      +   '<div class="mt2"><span>' + Util.relative(a.date) + '</span>'
      +   (a.location ? '<span>📍 ' + esc(a.location) + '</span>' : '')
      +   (a.photoIds && a.photoIds.length ? '<span>📷 ' + a.photoIds.length + '</span>' : '')
      +   (a.routeMapId ? '<span>🗺️</span>' : '') + '</div>'
      + '</div>'
      + '<div class="rt"><div class="v">' + (a.distanceKm != null ? Util.num(a.distanceKm, 2) : '—') + '</div>'
      + '<div class="l">km • ' + Util.dur(a.durationMin) + '</div></div></div>';
  }

  function openActivity(id) {
    Api.call('gsGetActivity', id).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      var a = r.activity, t = typeInfo(a.type);
      var body = ''
        + (a.routeUrl ? '<img src="' + esc(a.routeUrl) + '" style="border-radius:14px;margin-bottom:12px" alt="rute">' : '')
        + (a.photoUrls || []).map(function (u) { return '<img src="' + esc(u) + '" style="border-radius:14px;margin-bottom:8px" alt="bukti">'; }).join('')
        + '<div class="grid2 mt">'
        +   '<div class="stat-box"><div class="v">' + Util.num(a.distanceKm, 2) + '</div><div class="l">km</div></div>'
        +   '<div class="stat-box"><div class="v">' + Util.dur(a.durationMin) + '</div><div class="l">durasi</div></div>'
        +   '<div class="stat-box"><div class="v">' + Util.num(a.avgSpeed, 1) + '</div><div class="l">km/jam</div></div>'
        +   '<div class="stat-box"><div class="v">' + Util.pace(a.avgPace) + '</div><div class="l">pace /km</div></div>'
        + '</div>'
        + '<div class="card card-flat mt"><div class="small muted">Jenis</div><b>' + t.icon + ' ' + esc(t.label) + '</b>'
        + '<div class="small muted mt">Tanggal</div><b>' + Util.dateID(a.date) + '</b>'
        + (a.location ? '<div class="small muted mt">Lokasi</div><b>' + esc(a.location) + '</b>' : '')
        + (a.notes ? '<div class="small muted mt">Catatan</div><div>' + esc(a.notes) + '</div>' : '')
        + '</div>'
        + '<div class="row mt" style="gap:8px">'
        + '<button class="btn btn-ghost grow" onclick="YATRA.closeSheet()">Tutup</button>'
        + '<button class="btn btn-danger" onclick="YATRA.deleteActivity(\'' + a.id + '\')">Hapus</button></div>';
      openSheet(esc(a.title || t.label), body);
    }).catch(function (e) { Util.err(e.message); });
  }

  function deleteActivity(id) {
    Util.confirm('Hapus catatan perjalanan ini? Foto & gambar rute ikut terhapus.', 'Hapus Perjalanan').then(function (yes) {
      if (!yes) return;
      Api.call('gsDeleteActivity', id).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        Util.ok('Perjalanan dihapus.');
        closeSheet(); Api.cacheClear(); loadFeed();
      }).catch(function (e) { Util.err(e.message); });
    });
  }

  /* ============================================================== INPUT */
  function fillTypeSelects() {
    var opts = S.types.map(function (t) { return '<option value="' + t.key + '">' + t.icon + ' ' + t.label + '</option>'; }).join('');
    ['f-type', 's-type'].forEach(function (id) { if ($(id)) $(id).innerHTML = opts; });
    if ($('f-date')) $('f-date').value = Util.today();
    if ($('f-date')) $('f-date').max = Util.today();
  }

  function onPhotoPick(ev) {
    var files = Array.prototype.slice.call(ev.target.files || []).slice(0, 5);
    if (!files.length) return;
    S.photos = [];
    $('photoThumbs').innerHTML = '<span class="small muted">Mengompres…</span>';
    Promise.all(files.map(function (f) { return Util.compressImage(f); })).then(function (res) {
      S.photos = res.map(function (r, i) { return { data: r.data, name: 'bukti_' + (i + 1) + '.jpg', mime: 'image/jpeg' }; });
      $('photoThumbs').innerHTML = res.map(function (r) {
        return '<img src="' + r.data + '" title="' + r.sizeKB + ' KB" alt="pratinjau">';
      }).join('') + '<div class="small muted" style="width:100%">' + res.length + ' foto siap diunggah</div>';
    }).catch(function (e) { Util.err(e.message); $('photoThumbs').innerHTML = ''; });
  }

  function calcPace() {
    var d = parseFloat(Util.val('f-distance')) || 0, m = parseFloat(Util.val('f-duration')) || 0;
    $('f-pace').textContent = (d > 0 && m > 0)
      ? Util.num(d / (m / 60), 2) + ' km/jam • pace ' + Util.pace(m / d) + '/km' : '—';
  }

  function submitManual() {
    var payload = {
      type: Util.val('f-type'), title: Util.val('f-title'), date: Util.val('f-date'),
      location: Util.val('f-location'), distanceKm: Util.val('f-distance'),
      durationMin: Util.val('f-duration'), elevationM: Util.val('f-elev'),
      notes: Util.val('f-notes'), photos: S.photos, source: 'manual'
    };
    if (!payload.durationMin || Number(payload.durationMin) <= 0) return Util.warn('Durasi wajib diisi.');
    if (!payload.distanceKm) return Util.warn('Jarak wajib diisi.');
    if (!S.photos.length) return Util.warn('Foto bukti wajib diunggah (maks 200 KB/foto).');

    var btn = $('submitBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    Api.call('gsAddActivity', payload).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Perjalanan tersimpan!');
      resetForm();
      Api.cacheClear();
      if (r.newBadges && r.newBadges.length) celebrate(r.newBadges);
      go('home');
    }).catch(function (e) {
      if (!navigator.onLine) {
        Api.queue('gsAddActivity', [payload]);
        Util.warn('Offline — data disimpan dan akan dikirim otomatis.');
        resetForm(); go('home');
      } else Util.err(e.message);
    }).then(function () { btn.disabled = false; btn.textContent = '✔ Simpan Perjalanan'; });
  }

  function resetForm() {
    ['f-title', 'f-location', 'f-distance', 'f-duration', 'f-elev', 'f-notes'].forEach(function (id) { Util.setVal(id, ''); });
    S.photos = []; $('photoThumbs').innerHTML = ''; $('f-photos').value = ''; calcPace();
  }

  /* --------------------------------------------------------- IMPOR GPX */
  function onGpxPick(ev) {
    var f = (ev.target.files || [])[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var g = Util.parseGPX(e.target.result);
        Util.setVal('f-distance', g.distanceKm);
        Util.setVal('f-duration', g.durationMin || '');
        Util.setVal('f-elev', g.elevationM || '');
        Util.setVal('f-date', g.date);
        if (g.name) Util.setVal('f-title', g.name);
        S.gpxPoints = g.points.map(function (p) { return { lat: p.lat, lng: p.lng }; });
        calcPace();
        Util.ok('GPX dibaca: ' + g.distanceKm + ' km, ' + g.points.length + ' titik.');
      } catch (err) { Util.err(err.message); }
    };
    reader.readAsText(f);
  }

  /* ============================================================== LACAK */
  var trackMap = null, trackLine = null, trackMarker = null;

  function initMap() {
    if (trackMap || typeof L === 'undefined') return;
    trackMap = L.map('trackMap', { zoomControl: false, attributionControl: false }).setView([-7.5655, 110.8317], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(trackMap);
    trackLine = L.polyline([], { color: '#fc4c02', weight: 5, lineJoin: 'round' }).addTo(trackMap);
    setTimeout(function () { trackMap.invalidateSize(); }, 250);
  }

  function toggleTrack() {
    if (Tracker.active) { Tracker.pause(); return; }
    initMap();
    Tracker.onUpdate = onTrackUpdate;
    Tracker.onError = function (m) { $('trackStatus').textContent = m; };
    Tracker.start().then(function () {
      $('trackBtn').classList.add('hidden');
      $('pauseBtn').classList.remove('hidden');
      $('finishBtn').classList.remove('hidden');
      $('trackBlink').classList.remove('hidden');
      $('trackStatus').textContent = 'Merekam perjalanan…';
      Util.vibrate(30);
    }).catch(function (e) { Util.err(e.message); });
  }
  function togglePause() {
    if (Tracker.paused) { Tracker.resume(); $('pauseBtn').textContent = '⏸ Jeda'; $('trackStatus').textContent = 'Merekam perjalanan…'; }
    else { Tracker.pause(); $('pauseBtn').textContent = '▶ Lanjut'; $('trackStatus').textContent = 'Dijeda.'; }
  }
  function onTrackUpdate(s) {
    $('tDist').textContent = Util.num(s.distanceKm, 2);
    $('tTime').textContent = Util.clock(s.durationSec);
    $('tSpeed').textContent = Util.num(s.avgSpeed, 1);
    $('tPace').textContent = Util.pace(s.pace);
    $('tElev').textContent = Util.num(s.elevationM, 0);
    $('tAcc').textContent = s.accuracy ? Math.round(s.accuracy) + ' m' : '—';
    if (trackMap && s.lastPoint) {
      var latlngs = Tracker.points.map(function (p) { return [p.lat, p.lng]; });
      trackLine.setLatLngs(latlngs);
      if (!trackMarker) trackMarker = L.circleMarker([s.lastPoint.lat, s.lastPoint.lng], { radius: 7, color: '#fff', fillColor: '#fc4c02', fillOpacity: 1, weight: 3 }).addTo(trackMap);
      else trackMarker.setLatLng([s.lastPoint.lat, s.lastPoint.lng]);
      trackMap.panTo([s.lastPoint.lat, s.lastPoint.lng], { animate: true, duration: .5 });
    }
  }

  function finishTracking() {
    var s = Tracker.stop();
    $('trackBtn').classList.remove('hidden');
    $('pauseBtn').classList.add('hidden');
    $('finishBtn').classList.add('hidden');
    $('trackBlink').classList.add('hidden');
    $('trackStatus').textContent = 'Siap untuk mulai.';
    if (s.distanceKm < 0.05) return Util.warn('Jarak terlalu pendek untuk disimpan.');
    S.trackResult = s;
    openSheet('Simpan Perjalanan',
      '<div class="grid3 mb">'
      + '<div class="stat-box center"><div class="v">' + Util.num(s.distanceKm, 2) + '</div><div class="l">km</div></div>'
      + '<div class="stat-box center"><div class="v">' + Util.clock(s.durationSec) + '</div><div class="l">waktu</div></div>'
      + '<div class="stat-box center"><div class="v">' + Util.num(s.elevationM, 0) + '</div><div class="l">m naik</div></div>'
      + '</div>'
      + '<div class="field"><label>Jenis</label><select id="s-type"></select></div>'
      + '<div class="field"><label>Judul</label><input id="s-title" placeholder="cth: Gerak jalan pagi"></div>'
      + '<div class="field"><label>Lokasi</label><input id="s-location" placeholder="Kota / tempat"></div>'
      + '<div class="field"><label>Foto bukti (wajib, maks 200 KB)</label>'
      + '<input type="file" id="s-photos" accept="image/*" multiple onchange="YATRA.onPhotoPick(event)"><div class="thumbs" id="photoThumbs"></div></div>'
      + '<div class="field"><label>Catatan</label><textarea id="s-notes" rows="2"></textarea></div>'
      + '<button class="btn btn-primary btn-block" onclick="YATRA.saveTracked()">✔ Simpan</button>');
    fillTypeSelects();
    Util.vibrate([30, 40, 30]);
  }

  function saveTracked() {
    var s = S.trackResult;
    if (!s) return;
    if (!S.photos.length) return Util.warn('Foto bukti wajib diunggah.');
    var payload = {
      type: Util.val('s-type') || 'gerak-jalan', title: Util.val('s-title'), date: Util.today(),
      location: Util.val('s-location'), distanceKm: s.distanceKm, durationMin: s.durationMin,
      elevationM: s.elevationM, notes: Util.val('s-notes'), points: s.points,
      lat: s.start ? s.start.lat : '', lng: s.start ? s.start.lng : '',
      photos: S.photos, source: 'gps'
    };
    Api.call('gsAddActivity', payload).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Perjalanan tersimpan!');
      closeSheet(); S.trackResult = null; S.photos = []; Api.cacheClear();
      if (r.newBadges && r.newBadges.length) celebrate(r.newBadges);
      go('home');
    }).catch(function (e) {
      if (!navigator.onLine) {
        Api.queue('gsAddActivity', [payload]);
        Util.warn('Offline — tersimpan di perangkat, akan dikirim otomatis.');
        closeSheet(); go('home');
      } else Util.err(e.message);
    });
  }

  /* ================================================================ SKK */
  function loadSkk() {
    $('skkBody').innerHTML = '<div class="skeleton" style="height:120px"></div>';
    Api.call('gsGetSkk').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.skk = r.skk;
      var k = r.skk;
      if (!k.levels.length) {
        $('skkBody').innerHTML = '<div class="empty"><div class="ic">⚙️</div>Kriteria SKK untuk golongan '
          + esc(k.golongan || '-') + ' ' + esc(k.gender || '') + ' belum diatur admin.</div>';
        return;
      }
      $('skkBody').innerHTML = ''
        + '<div class="card card-brand"><div class="small" style="opacity:.9">Tingkat Tervalidasi</div>'
        + '<div style="font-size:26px;font-weight:900">' + (k.validatedLabel || 'Belum Ada') + '</div>'
        + '<div class="small" style="opacity:.9">' + k.totalTrips + ' perjalanan memenuhi jenis syarat</div></div>'
        + k.levels.map(function (l) {
            var sub = l.submission;
            var badge = sub ? (sub.status === 'lulus' ? '<span class="pill pill-ok">Lulus</span>'
                        : sub.status === 'ditolak' ? '<span class="pill pill-warn">Ditolak</span>'
                        : '<span class="pill pill-info">Menunggu</span>')
                       : (l.reached ? '<span class="pill pill-brand">Siap diajukan</span>' : '<span class="pill pill-muted">Belum</span>');
            return '<div class="skk-level' + (l.reached ? ' done' : '') + '">'
              + '<div class="row spread"><b>🎗️ SKK ' + esc(l.label) + '</b>' + badge + '</div>'
              + '<div class="small muted mt">Syarat: ' + l.minTrips + '× perjalanan ≥ ' + l.distanceKm + ' km'
              + (l.note ? ' — ' + esc(l.note) : '') + '</div>'
              + '<div class="bar mt' + (l.reached ? ' ok' : '') + '"><i style="width:' + l.pct + '%"></i></div>'
              + '<div class="row spread mt"><span class="small muted">' + l.trips + ' / ' + l.minTrips + ' tercapai</span>'
              + (l.reached && (!sub || sub.status === 'ditolak')
                 ? '<button class="btn btn-xs btn-primary" onclick="YATRA.submitSkk(\'' + l.level + '\')">Ajukan Validasi</button>' : '')
              + '</div>'
              + (sub && sub.feedback ? '<div class="small mt" style="color:var(--warn)">💬 ' + esc(sub.feedback) + '</div>' : '')
              + (l.evidence && l.evidence.length ? '<div class="small muted mt">Bukti: ' + l.evidence.map(function (e2) {
                    return Util.dateID(e2.date) + ' (' + e2.distanceKm + ' km)'; }).join(', ') + '</div>' : '')
              + '</div>';
          }).join('');
    }).catch(function (e) { Util.err(e.message); });
  }

  function submitSkk(level) {
    openSheet('Ajukan SKK ' + Util.cap(level),
      '<div class="field"><label>Catatan untuk pembina (opsional)</label><textarea id="skk-notes" rows="3" placeholder="cth: bukti tambahan sudah diunggah ke folder"></textarea></div>'
      + '<button class="btn btn-primary btn-block" onclick="YATRA.confirmSkk(\'' + level + '\')">Kirim Pengajuan</button>');
  }
  function confirmSkk(level) {
    Api.call('gsSkkSubmit', level, Util.val('skk-notes')).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      closeSheet();
      Util.ok('Pengajuan terkirim!');
      if (r.folderUrl) openSheet('Pengajuan Terkirim',
        '<p class="small">Unggah bukti tambahan ke folder Drive berikut bila diminta pembina:</p>'
        + '<a class="btn btn-ghost btn-block" href="' + esc(r.folderUrl) + '" target="_blank" rel="noopener">📁 Buka Folder Drive</a>'
        + '<button class="btn btn-primary btn-block mt" onclick="YATRA.closeSheet();YATRA.go(\'skk\')">Selesai</button>');
      else loadSkk();
    }).catch(function (e) { Util.err(e.message); });
  }

  /* ================================================================ SKU */
  function loadSku() {
    $('skuBody').innerHTML = '<div class="skeleton" style="height:120px"></div>';
    Api.call('gsGetSku').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.sku = r;
      var levels = r.levels.map(function (lv) { return r.progress[lv]; }).filter(Boolean);
      $('skuBody').innerHTML = ''
        + '<div class="card card-brand"><div class="small" style="opacity:.9">SKU Saat Ini</div>'
        + '<div style="font-size:24px;font-weight:900">' + esc(r.labels[r.current] || 'Belum ada') + '</div></div>'
        + levels.map(function (l) {
            return '<div class="card"><div class="row spread"><b>' + esc(l.label) + '</b>'
              + '<span class="pill ' + (l.complete ? 'pill-ok' : 'pill-muted') + '">' + l.done + '/' + l.total + '</span></div>'
              + '<div class="bar mt' + (l.complete ? ' ok' : '') + '"><i style="width:' + l.pct + '%"></i></div>'
              + '<div class="mt">' + l.items.map(function (i) {
                  var ic = i.status === 'lulus' ? '✅' : i.status === 'menunggu' ? '⏳' : i.status === 'ditolak' ? '❌' : '⬜';
                  return '<div class="sku-item"><span class="code">' + esc(i.code) + '</span>'
                    + '<span class="ttl">' + esc(i.title) + '<div class="small muted">' + esc(i.category) + '</div></span>'
                    + '<span style="flex:none">' + (i.status === 'belum' || i.status === 'ditolak'
                      ? '<button class="btn btn-xs btn-ghost" onclick="YATRA.claimSku(\'' + l.level + '\',\'' + i.code + '\')">' + ic + ' Ajukan</button>'
                      : ic) + '</span></div>';
                }).join('') + '</div></div>';
          }).join('');
    }).catch(function (e) { Util.err(e.message); });
  }
  function claimSku(level, code) {
    Api.call('gsSkuClaim', level, code, '').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Butir SKU diajukan ke pembina.');
      loadSku();
    }).catch(function (e) { Util.err(e.message); });
  }

  /* ============================================================ STATISTIK */
  function loadStat() {
    Api.call('gsDashboard', 'all').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      var st = r.allTime || r.stats;
      $('statBody').innerHTML = ''
        + '<div class="stat-grid">'
        +   statBox('🛣️', Util.num(st.totalDistance, 1), 'total km')
        +   statBox('🥾', st.count || 0, 'perjalanan')
        +   statBox('⏱️', Util.dur(st.totalDuration), 'total waktu')
        +   statBox('⚡', Util.num(st.avgSpeed, 1), 'km/jam rata2')
        +   statBox('📏', Util.num(st.avgDistance, 1), 'km rata2')
        +   statBox('🔥', st.streak || 0, 'streak')
        + '</div>'
        + (st.longest ? '<div class="card"><div class="small muted">Perjalanan terjauh</div>'
            + '<b>' + esc(st.longest.title) + '</b><div class="small muted">' + Util.dateID(st.longest.date)
            + ' • ' + Util.num(st.longest.distanceKm, 2) + ' km</div></div>' : '')
        + '<div class="section-title">Komposisi Kegiatan</div><div class="card"><canvas id="typeChart" class="chart" style="height:200px"></canvas></div>'
        + '<div class="section-title">Target Bulanan</div>'
        + '<div class="card"><div class="field"><label>Target jarak per bulan (km)</label>'
        + '<input type="number" step="1" id="p-target" value="' + (S.user.targetKm || '') + '" placeholder="cth: 40"></div>'
        + '<button class="btn btn-primary btn-block" onclick="YATRA.saveTarget()">Simpan Target</button></div>'
        + '<div class="section-title">Lencana</div><div id="badgeGrid"><div class="skeleton"></div></div>'
        + '<div class="section-title">Laporan</div>'
        + '<div class="card"><div class="grid2">'
        + '<button class="btn btn-ghost" onclick="YATRA.exportReport(\'pdf\')">📄 PDF</button>'
        + '<button class="btn btn-ghost" onclick="YATRA.exportReport(\'xlsx\')">📊 Excel</button></div>'
        + '<div id="exportResult" class="small mt"></div></div>';
      S.dashboard = r;
      drawCharts();
      loadBadges();
    }).catch(function (e) { Util.err(e.message); });
  }
  function loadBadges() {
    Api.call('gsGetBadges').then(function (r) {
      if (!r.ok) return;
      $('badgeGrid').innerHTML = '<div class="small muted mb">' + r.earned + ' dari ' + r.total + ' lencana diperoleh</div>'
        + '<div class="badge-grid">' + r.items.map(function (b) {
            return '<div class="badge ' + (b.earned ? 'earned' : 'locked') + '" title="' + esc(b.desc) + '">'
              + '<div class="ic">' + b.icon + '</div><div class="nm">' + esc(b.name) + '</div></div>';
          }).join('') + '</div>';
    });
  }
  function saveTarget() {
    Api.call('gsSetTarget', Util.val('p-target')).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.user.targetKm = r.targetKm;
      Util.ok('Target disimpan.'); Api.cacheClear();
    }).catch(function (e) { Util.err(e.message); });
  }
  function exportReport(fmt) {
    $('exportResult').innerHTML = 'Menyiapkan laporan…';
    Api.call('gsExportReport', fmt, 'all').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      $('exportResult').innerHTML = '✅ <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>';
    }).catch(function (e) { $('exportResult').innerHTML = ''; Util.err(e.message); });
  }

  /* =========================================================== PERINGKAT */
  var boardTab = 'individu';
  function loadBoard() {
    Util.$$('#boardTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === boardTab); });
    $('boardBody').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    if (boardTab === 'regu') {
      Api.call('gsReguLeaderboard', S.range).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        $('boardBody').innerHTML = !r.items.length ? '<div class="empty">Belum ada data regu.</div>'
          : r.items.map(function (g) {
              return '<div class="item"><div class="ic" style="background:' + esc(g.color) + '22;color:' + esc(g.color) + '">'
                + (g.rank <= 3 ? ['🥇', '🥈', '🥉'][g.rank - 1] : g.rank) + '</div>'
                + '<div class="grow"><div class="tt">' + esc(g.regu) + '</div>'
                + '<div class="mt2"><span>' + g.activeMembers + '/' + g.members + ' aktif</span><span>' + g.count + ' perjalanan</span>'
                + '<span>' + g.participation + '% partisipasi</span></div></div>'
                + '<div class="rt"><div class="v">' + Util.num(g.distanceKm, 1) + '</div><div class="l">km</div></div></div>';
            }).join('');
      }).catch(function (e) { Util.err(e.message); });
    } else if (boardTab === 'bukti') {
      Api.call('gsLeadership', S.range).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        $('boardBody').innerHTML = !r.proofs.length ? '<div class="empty">Belum ada bukti perjalanan.</div>'
          : '<div class="grid2">' + r.proofs.slice(0, 40).map(function (p) {
              return '<div class="card card-flat" style="padding:8px">'
                + '<img src="' + esc(p.photoUrl) + '" loading="lazy" style="border-radius:10px;aspect-ratio:1;object-fit:cover" alt="bukti">'
                + '<div class="small" style="font-weight:700;margin-top:6px">' + esc(p.nickname) + '</div>'
                + '<div class="small muted">' + Util.num(p.distanceKm, 1) + ' km • ' + Util.relative(p.date) + '</div></div>';
            }).join('') + '</div>';
      }).catch(function (e) { Util.err(e.message); });
    } else {
      Api.call('gsLeaderboard', S.range).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        var me = r.me;
        $('boardBody').innerHTML = (me ? '<div class="card card-brand"><div class="row spread">'
            + '<span>Peringkat Anda</span><b style="font-size:22px">#' + me.rank + '</b></div>'
            + '<div class="small" style="opacity:.9">' + Util.num(me.distanceKm, 2) + ' km • ' + me.count + ' perjalanan</div></div>' : '')
          + (!r.items.length ? '<div class="empty">Belum ada data peringkat.</div>'
            : r.items.slice(0, 50).map(function (o) {
                var rc = o.rank <= 3 ? ' rank-' + o.rank : '';
                return '<div class="item"><div class="ic' + rc + '">' + (o.rank <= 3 ? ['🥇', '🥈', '🥉'][o.rank - 1] : o.rank) + '</div>'
                  + '<div class="grow"><div class="tt">' + esc(o.nickname || o.username) + '</div>'
                  + '<div class="mt2">' + (o.regu ? '<span>🏕️ ' + esc(o.regu) + '</span>' : '')
                  + '<span>' + o.count + '× </span>' + (o.skkLevel ? '<span class="pill pill-ok">' + esc(Util.cap(o.skkLevel)) + '</span>' : '') + '</div></div>'
                  + '<div class="rt"><div class="v">' + Util.num(o.distanceKm, 1) + '</div><div class="l">km</div></div></div>';
              }).join(''));
      }).catch(function (e) { Util.err(e.message); });
    }
  }
  function setBoardTab(t) { boardTab = t; loadBoard(); }

  /* ============================================================== PROFIL */
  function loadProfile() {
    var u = S.user || {};
    Util.setVal('p-userid', u.username);
    Util.setVal('p-name', u.name); Util.setVal('p-nick', u.nickname);
    Util.setVal('p-golongan', u.golongan); Util.setVal('p-gender', u.gender);
    Util.setVal('p-sku', u.sku); Util.setVal('p-phone', u.phone);
    var sel = $('p-regu');
    sel.innerHTML = '<option value="">— pilih regu —</option>' + S.regus.map(function (r) {
      return '<option value="' + esc(r.name) + '"' + (r.name === u.regu ? ' selected' : '') + '>' + esc(r.name) + ' (' + esc(r.pasukan) + ')</option>';
    }).join('');
    $('profilePhotoPreview').innerHTML = u.profilePhotoId
      ? '<img src="' + esc(thumb(u.profilePhotoId, 200)) + '" alt="foto profil">' : '<span class="small muted">Belum ada foto</span>';
    Util.show('adminCardLink', u.role === 'admin' || u.role === 'pembina');
    refreshBioCard();
  }

  function onProfilePhotoPick(ev) {
    var f = (ev.target.files || [])[0];
    if (!f) return;
    Util.compressImage(f, 190, 800).then(function (r) {
      S.profilePhoto = r.data;
      $('profilePhotoPreview').innerHTML = '<img src="' + r.data + '" alt="pratinjau">'
        + '<button class="btn btn-xs btn-primary" onclick="YATRA.uploadProfilePhoto()">Unggah (' + r.sizeKB + ' KB)</button>';
    }).catch(function (e) { Util.err(e.message); });
  }
  function uploadProfilePhoto() {
    if (!S.profilePhoto) return;
    Api.call('gsSaveProfilePhoto', S.profilePhoto).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.user.profilePhotoId = r.fileId;
      Util.ok('Foto profil diperbarui.');
      renderHeader(); loadProfile();
    }).catch(function (e) { Util.err(e.message); });
  }

  function saveProfile() {
    var p = {
      name: Util.val('p-name'), nickname: Util.val('p-nick'), golongan: Util.val('p-golongan'),
      gender: Util.val('p-gender'), sku: Util.val('p-sku'), regu: Util.val('p-regu'), phone: Util.val('p-phone')
    };
    if (!p.name || !p.nickname || !p.golongan || !p.gender) return Util.warn('Nama, panggilan, golongan, dan putra/putri wajib diisi.');
    Api.call('gsSaveProfile', p).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      S.user = r.user;
      Util.ok('Profil tersimpan.');
      renderHeader(); Api.cacheClear();
    }).catch(function (e) { Util.err(e.message); });
  }

  function changePassword() {
    var o = Util.val('p-old'), n = Util.val('p-new');
    if (!o || !n) return Util.warn('Isi password lama dan baru.');
    Api.call('gsChangePassword', o, n).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Password berhasil diubah.');
      Util.setVal('p-old', ''); Util.setVal('p-new', '');
      // Kredensial biometrik menyimpan password lama — cabut agar tidak basi.
      if (global.Bio && Bio.enrolled()) {
        Bio.remove().then(function () {
          Util.warn('Pendaftaran biometrik dibatalkan karena password berubah. Silakan daftarkan ulang.');
          refreshBioCard();
        });
      }
    }).catch(function (e) { Util.err(e.message); });
  }

  /* ================================================= KARTU PENCAPAIAN */
  function loadCard() {
    Api.call('gsGetAchievement').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      drawCard(r);
    }).catch(function (e) { Util.err(e.message); });
  }
  function drawCard(d) {
    var cv = $('achCanvas'), ctx = cv.getContext('2d');
    var W = cv.width = 1080, H = cv.height = 1350;
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0d0f14'); g.addColorStop(.55, '#1c1208'); g.addColorStop(1, '#7a2500');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(252,76,2,.5)'; ctx.lineWidth = 6;
    ctx.strokeRect(34, 34, W - 68, H - 68);

    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = '900 74px system-ui, sans-serif';
    ctx.fillText('YATRA', W / 2, 175);
    ctx.font = '600 30px system-ui, sans-serif'; ctx.fillStyle = '#ff8a3d';
    ctx.fillText('KARTU PENCAPAIAN PERJALANAN', W / 2, 222);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText((d.gudep || '') + (d.pangkalan ? ' • ' + d.pangkalan : ''), W / 2, 262);

    var u = d.user || {};
    ctx.fillStyle = '#fff'; ctx.font = '800 52px system-ui, sans-serif';
    ctx.fillText(u.nickname || u.name || u.username, W / 2, 400);
    ctx.font = '400 28px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText(u.username + ' • ' + (u.regu || u.golongan || ''), W / 2, 444);

    var st = d.stats || {};
    var cells = [
      [Util.num(st.totalDistance, 1), 'KM TOTAL'],
      [String(st.count || 0), 'PERJALANAN'],
      [Util.dur(st.totalDuration), 'DURASI'],
      [Util.num(st.avgSpeed, 1), 'KM/JAM'],
      [String(st.streak || 0), 'STREAK'],
      [Util.num(st.totalElevation, 0), 'M ELEVASI']
    ];
    cells.forEach(function (c, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var x = 110 + col * 460, y = 540 + row * 165;
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      roundRect(ctx, x, y, 400, 135, 20); ctx.fill();
      ctx.fillStyle = '#ff8a3d'; ctx.font = '900 52px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(c[0], x + 200, y + 66);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText(c[1], x + 200, y + 102);
    });

    var skk = d.skk || {};
    ctx.fillStyle = 'rgba(252,76,2,.18)';
    roundRect(ctx, 110, 1060, 860, 100, 20); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 34px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SKK Gerak Jalan: ' + (skk.validatedLabel || 'Dalam Proses'), W / 2, 1122);

    var bl = (d.badges || []).slice(0, 8).map(function (b) { return b.icon; }).join(' ');
    if (bl) { ctx.font = '400 44px system-ui, sans-serif'; ctx.fillText(bl, W / 2, 1215); }

    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '400 22px system-ui, sans-serif';
    ctx.fillText('Periode ' + (d.dateRange.from || '-') + ' s.d. ' + (d.dateRange.to || '-'), W / 2, 1275);

    if (d.logo) {
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, W / 2 - 55, 60, 110, 110); };
      img.src = d.logo;
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function downloadCard() {
    Util.download($('achCanvas').toDataURL('image/jpeg', 0.92), 'Kartu_YATRA_' + (S.user.username || '') + '.jpg');
    Util.ok('Kartu diunduh.');
  }
  function saveCardDrive() {
    Api.call('gsSaveCard', $('achCanvas').toDataURL('image/jpeg', 0.9), 'Kartu_' + S.user.username).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Kartu tersimpan ke Drive.');
    }).catch(function (e) { Util.err(e.message); });
  }
  function shareCard() {
    var cv = $('achCanvas');
    if (!navigator.share || !cv.toBlob) return downloadCard();
    cv.toBlob(function (blob) {
      var file = new File([blob], 'kartu-yatra.jpg', { type: 'image/jpeg' });
      navigator.share({ files: [file], title: 'Kartu Pencapaian YATRA', text: 'Pencapaian perjalanan saya di YATRA!' })
        .catch(function () {});
    }, 'image/jpeg', 0.9);
  }

  /* =============================================================== ADMIN */
  var adminTab = 'ringkasan';
  function loadAdmin() {
    Util.$$('#adminTabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === adminTab); });
    var body = $('adminBody');
    body.innerHTML = '<div class="skeleton" style="height:100px"></div>';
    if (adminTab === 'ringkasan') {
      Api.call('gsAdminOverview', 'this_month').then(function (r) {
        if (!r.ok) throw new Error(r.error);
        body.innerHTML = '<div class="stat-grid">'
          + statBox('👥', r.members, 'anggota') + statBox('🏃', r.activeMembers, 'aktif bulan ini')
          + statBox('🛣️', Util.num(r.totalKm, 1), 'km bulan ini') + statBox('📝', r.activities, 'perjalanan')
          + statBox('🎗️', r.pendingSkk, 'SKK menunggu') + statBox('📋', r.pendingSku, 'SKU menunggu')
          + '</div>'
          + '<div class="section-title">Peringkat Regu</div>'
          + r.regu.map(function (g) {
              return '<div class="item"><div class="ic">' + g.rank + '</div><div class="grow">'
                + '<div class="tt">' + esc(g.regu) + '</div><div class="mt2"><span>' + g.activeMembers + '/' + g.members
                + ' aktif</span><span>' + g.participation + '%</span></div></div>'
                + '<div class="rt"><div class="v">' + Util.num(g.distanceKm, 1) + '</div><div class="l">km</div></div></div>';
            }).join('')
          + '<div class="section-title">Ekspor</div><div class="card"><div class="grid2">'
          + '<button class="btn btn-ghost" onclick="YATRA.exportAll(\'xlsx\')">📊 Rekap Excel</button>'
          + '<button class="btn btn-ghost" onclick="YATRA.exportAll(\'pdf\')">📄 Rekap PDF</button></div>'
          + '<div id="adminExport" class="small mt"></div></div>';
      }).catch(function (e) { Util.err(e.message); });
    } else if (adminTab === 'anggota') {
      Api.call('gsAdminListUsers', {}).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        body.innerHTML = '<button class="btn btn-primary btn-block mb" onclick="YATRA.addUserForm()">+ Tambah Anggota</button>'
          + '<div class="card" style="overflow-x:auto"><table class="table"><thead><tr><th>UserID</th><th>Nama</th><th>Regu</th><th>Km</th><th></th></tr></thead><tbody>'
          + r.items.map(function (u) {
              return '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.nickname || u.name) + '</td>'
                + '<td>' + esc(u.regu || '-') + '</td><td>' + Util.num(u.totalKm, 1) + '</td>'
                + '<td><button class="btn btn-xs btn-ghost" onclick="YATRA.resetPass(\'' + esc(u.username) + '\')">🔑</button></td></tr>';
            }).join('') + '</tbody></table></div>';
      }).catch(function (e) { Util.err(e.message); });
    } else if (adminTab === 'validasi') {
      Promise.all([Api.call('gsAdminListSkkSubmissions'), Api.call('gsAdminListSkuClaims', 'menunggu')]).then(function (res) {
        var skk = res[0].items || [], sku = res[1].items || [];
        body.innerHTML = '<div class="section-title">Pengajuan SKK</div>'
          + (!skk.length ? '<div class="empty">Tidak ada pengajuan.</div>' : skk.map(function (s) {
              return '<div class="card"><div class="row spread"><b>' + esc(s.nickname || s.username) + ' — SKK ' + esc(s.label) + '</b>'
                + '<span class="pill ' + (s.status === 'lulus' ? 'pill-ok' : s.status === 'ditolak' ? 'pill-warn' : 'pill-info') + '">' + esc(s.status) + '</span></div>'
                + '<div class="small muted mt">' + Util.dateID(s.date) + (s.regu ? ' • ' + esc(s.regu) : '') + '</div>'
                + (s.notes ? '<div class="small mt">💬 ' + esc(s.notes) + '</div>' : '')
                + (s.evidence && s.evidence.length ? '<div class="small muted mt">Bukti: ' + s.evidence.map(function (e2) {
                    return Util.dateID(e2.date) + ' (' + e2.distanceKm + ' km)'; }).join(', ') + '</div>' : '')
                + '<div class="row mt" style="gap:6px">'
                + (s.folderUrl ? '<a class="btn btn-xs btn-ghost" href="' + esc(s.folderUrl) + '" target="_blank" rel="noopener">📁 Folder</a>' : '')
                + (s.status !== 'lulus' ? '<button class="btn btn-xs btn-ok" onclick="YATRA.validateSkk(\'' + s.id + '\',\'lulus\')">✓ Luluskan</button>' : '')
                + '<button class="btn btn-xs btn-danger" onclick="YATRA.validateSkk(\'' + s.id + '\',\'ditolak\')">✕ Tolak</button>'
                + '</div></div>';
            }).join(''))
          + '<div class="section-title">Pengajuan SKU</div>'
          + (!sku.length ? '<div class="empty">Tidak ada pengajuan.</div>' : sku.map(function (c) {
              return '<div class="card"><div class="row spread"><b>' + esc(c.nickname || c.username) + '</b>'
                + '<span class="pill pill-info">' + esc(c.level) + ' ' + esc(c.code) + '</span></div>'
                + '<div class="small mt">' + esc(c.title) + '</div>'
                + '<div class="row mt" style="gap:6px">'
                + '<button class="btn btn-xs btn-ok" onclick="YATRA.validateSku(\'' + esc(c.username) + '\',\'' + esc(c.level) + '\',\'' + esc(c.code) + '\',\'lulus\')">✓ Lulus</button>'
                + '<button class="btn btn-xs btn-danger" onclick="YATRA.validateSku(\'' + esc(c.username) + '\',\'' + esc(c.level) + '\',\'' + esc(c.code) + '\',\'ditolak\')">✕ Belum</button>'
                + '</div></div>';
            }).join(''));
      }).catch(function (e) { Util.err(e.message); });
    } else if (adminTab === 'skk') {
      Api.call('gsAdminGetSkkConfig').then(function (r) {
        if (!r.ok) throw new Error(r.error);
        body.innerHTML = '<div class="card"><div class="small muted mb">Atur syarat SKK Gerak Jalan per golongan & jenis kelamin.</div>'
          + '<div style="overflow-x:auto"><table class="table" id="skkCfgTable"><thead><tr><th>Golongan</th><th>L/P</th><th>Tingkat</th><th>Km</th><th>Min</th><th>Aktif</th></tr></thead><tbody>'
          + r.items.map(function (c, i) {
              return '<tr data-i="' + i + '">'
                + '<td><input value="' + esc(c.golongan) + '" data-f="golongan" style="width:90px"></td>'
                + '<td><input value="' + esc(c.gender) + '" data-f="gender" style="width:56px"></td>'
                + '<td><input value="' + esc(c.level) + '" data-f="level" style="width:64px"></td>'
                + '<td><input type="number" value="' + c.distanceKm + '" data-f="distanceKm" style="width:56px"></td>'
                + '<td><input type="number" value="' + c.minTrips + '" data-f="minTrips" style="width:48px"></td>'
                + '<td><input type="checkbox" data-f="enabled"' + (c.enabled ? ' checked' : '') + '></td></tr>';
            }).join('') + '</tbody></table></div>'
          + '<button class="btn btn-primary btn-block mt" onclick="YATRA.saveSkkConfig()">Simpan Konfigurasi</button></div>';
      }).catch(function (e) { Util.err(e.message); });
    } else if (adminTab === 'pengumuman') {
      body.innerHTML = '<div class="card">'
        + '<div class="field"><label>Judul</label><input id="an-title"></div>'
        + '<div class="field"><label>Isi</label><textarea id="an-body" rows="3"></textarea></div>'
        + '<button class="btn btn-primary btn-block" onclick="YATRA.saveAnnouncement()">Terbitkan</button></div>'
        + (S.init.announcements || []).map(function (a) {
            return '<div class="card card-flat"><div class="row spread"><b>' + esc(a.title) + '</b>'
              + '<button class="btn btn-xs btn-danger" onclick="YATRA.deleteAnnouncement(\'' + a.id + '\')">Hapus</button></div>'
              + '<div class="small muted mt">' + esc(a.body) + '</div></div>';
          }).join('');
    }
  }
  function setAdminTab(t) { adminTab = t; loadAdmin(); }

  function addUserForm() {
    openSheet('Tambah Anggota',
      '<div class="field"><label>UserID</label><input id="a-user" placeholder="dgw202651"></div>'
      + '<div class="field"><label>Password</label><input id="a-pass" placeholder="min 6 karakter"></div>'
      + '<div class="field"><label>Nama Lengkap</label><input id="a-name"></div>'
      + '<div class="field"><label>Nama Panggilan</label><input id="a-nick"></div>'
      + '<div class="grid2"><div class="field"><label>Putra/Putri</label><select id="a-gender"><option value="putra">Putra</option><option value="putri">Putri</option></select></div>'
      + '<div class="field"><label>Regu</label><select id="a-regu"><option value="">—</option>'
      + S.regus.map(function (r) { return '<option>' + esc(r.name) + '</option>'; }).join('') + '</select></div></div>'
      + '<button class="btn btn-primary btn-block" onclick="YATRA.addUser()">Simpan</button>'
      + '<div class="section-title">Impor Massal</div>'
      + '<div class="field"><label>CSV: userid,nama,panggilan,gender,regu</label><textarea id="a-csv" rows="4"></textarea></div>'
      + '<button class="btn btn-ghost btn-block" onclick="YATRA.bulkAddUsers()">Impor CSV</button>');
  }
  function addUser() {
    Api.call('gsAdminAddUser', { username: Util.val('a-user'), password: Util.val('a-pass'), name: Util.val('a-name'),
      nickname: Util.val('a-nick'), gender: Util.val('a-gender'), regu: Util.val('a-regu'), golongan: 'Penggalang' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error);
        Util.ok('Anggota ditambahkan.'); closeSheet(); loadAdmin();
      }).catch(function (e) { Util.err(e.message); });
  }
  function bulkAddUsers() {
    Api.call('gsAdminBulkAddUsers', Util.val('a-csv'), '12345678').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok(r.added + ' anggota ditambahkan' + (r.failed.length ? ', ' + r.failed.length + ' gagal.' : '.'));
      closeSheet(); loadAdmin();
    }).catch(function (e) { Util.err(e.message); });
  }
  function resetPass(username) {
    var p = prompt('Password baru untuk ' + username + ' (min 6 karakter):', '12345678');
    if (!p) return;
    Api.call('gsAdminResetPass', username, p).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Password direset.');
    }).catch(function (e) { Util.err(e.message); });
  }
  function validateSkk(id, status) {
    Api.call('gsAdminValidateSkk', id, status, '').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Pengajuan diperbarui.'); loadAdmin();
    }).catch(function (e) { Util.err(e.message); });
  }
  function validateSku(username, level, code, status) {
    Api.call('gsSkuValidate', username, level, code, status, '').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Butir SKU diperbarui.'); loadAdmin();
    }).catch(function (e) { Util.err(e.message); });
  }
  function saveSkkConfig() {
    var list = Util.$$('#skkCfgTable tbody tr').map(function (tr) {
      var o = {};
      Util.$$('[data-f]', tr).forEach(function (inp) {
        o[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value;
      });
      return o;
    });
    Api.call('gsAdminSetSkkConfig', list).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      Util.ok('Konfigurasi SKK disimpan.');
    }).catch(function (e) { Util.err(e.message); });
  }
  function saveAnnouncement() {
    Api.call('gsAdminSaveAnnouncement', { title: Util.val('an-title'), body: Util.val('an-body'), level: 'info' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error);
        Util.ok('Pengumuman diterbitkan.');
        return Api.call('gsInitData').then(function (i) { S.init = i; loadAdmin(); });
      }).catch(function (e) { Util.err(e.message); });
  }
  function deleteAnnouncement(id) {
    Api.call('gsAdminDeleteAnnouncement', id).then(function () {
      Util.ok('Dihapus.');
      return Api.call('gsInitData').then(function (i) { S.init = i; loadAdmin(); });
    });
  }
  function exportAll(fmt) {
    $('adminExport').innerHTML = 'Menyiapkan…';
    Api.call('gsAdminExportAll', fmt, 'all').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      $('adminExport').innerHTML = '✅ <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.name) + '</a>';
    }).catch(function (e) { $('adminExport').innerHTML = ''; Util.err(e.message); });
  }

  /* ============================================================== SHEET */
  function openSheet(title, body) {
    $('sheetTitle').innerHTML = title;
    $('sheetBody').innerHTML = body;
    $('sheetModal').classList.add('show');
  }
  function closeSheet() { $('sheetModal').classList.remove('show'); }

  /* =============================================================== INIT */
  function init() {
    applyTheme();
    Api.loadToken();
    global.addEventListener('yatra:session-expired', function () {
      Util.warn('Sesi berakhir. Silakan masuk kembali.');
      $('app').classList.add('hidden');
      $('login-view').classList.remove('hidden');
    });
    $('l-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });

    var draft = Tracker.getDraft();
    if (draft) {
      setTimeout(function () {
        Util.confirm('Ditemukan rekaman perjalanan yang belum tersimpan (' + Math.round(draft.distanceKm * 100) / 100 + ' km). Pulihkan?', 'Pulihkan Rekaman')
          .then(function (yes) {
            if (yes) { go('track'); initMap(); Tracker.onUpdate = onTrackUpdate; Tracker.restoreDraft(draft); $('finishBtn').classList.remove('hidden'); }
            else Tracker.clearDraft();
          });
      }, 1200);
    }

    if (Api.token) {
      Api.call('gsCurrentUser').then(function (r) {
        if (r.ok && r.user) { S.user = r.user; return boot(); }
        $('login-view').classList.remove('hidden');
        refreshBioLogin();
      }).catch(function () {
        $('login-view').classList.remove('hidden');
        refreshBioLogin();
      });
    } else {
      $('login-view').classList.remove('hidden');
      refreshBioLogin();
    }

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  }

  /* --------------------------------------------------------- EKSPOR API */
  global.YATRA = {
    init: init, go: go, setRange: setRange, doLogin: doLogin, doLogout: doLogout,
    toggleTheme: toggleTheme, openSheet: openSheet, closeSheet: closeSheet,
    onPhotoPick: onPhotoPick, calcPace: calcPace, submitManual: submitManual, onGpxPick: onGpxPick,
    toggleTrack: toggleTrack, togglePause: togglePause, finishTracking: finishTracking, saveTracked: saveTracked,
    openActivity: openActivity, deleteActivity: deleteActivity, searchFeed: searchFeed, loadFeed: loadFeed,
    submitSkk: submitSkk, confirmSkk: confirmSkk, claimSku: claimSku,
    saveTarget: saveTarget, exportReport: exportReport, setBoardTab: setBoardTab,
    saveProfile: saveProfile, changePassword: changePassword,
    togglePass: togglePass, doBioLogin: doBioLogin,
    bioEnroll: bioEnroll, bioRemove: bioRemove,
    onProfilePhotoPick: onProfilePhotoPick, uploadProfilePhoto: uploadProfilePhoto,
    downloadCard: downloadCard, saveCardDrive: saveCardDrive, shareCard: shareCard,
    setAdminTab: setAdminTab, addUserForm: addUserForm, addUser: addUser, bulkAddUsers: bulkAddUsers,
    resetPass: resetPass, validateSkk: validateSkk, validateSku: validateSku,
    saveSkkConfig: saveSkkConfig, saveAnnouncement: saveAnnouncement,
    deleteAnnouncement: deleteAnnouncement, exportAll: exportAll
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
