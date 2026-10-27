/* SimpAset — app.js */
(function () {
  'use strict';

  const CFG = window.SIMPASET_CONFIG || {};
  const CLOUD = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const LS_KEY = 'simpaset.db.v1';
  const SESSION_KEY = 'simpaset.session.v1';

  /* ---------------- helpers ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const nf = new Intl.NumberFormat('id-ID');
  const Rp = (n) => 'Rp ' + nf.format(Math.round(Number(n) || 0));
  const RpShort = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' jt';
    if (n >= 1e3) return 'Rp ' + Math.round(n / 1e3) + ' rb';
    return Rp(n);
  };
  const uid = () => 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
  };
  const fmtMonthYear = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '—';
    return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function confirmDialog(title, text, okLabel, onOk) {
    const root = $('#dialog-root');
    root.innerHTML =
      '<div class="dialog"><div class="bg" data-close="1"></div>' +
      '<div class="box"><h4>' + esc(title) + '</h4><p>' + esc(text) + '</p>' +
      '<div class="acts"><button class="cancel" data-close="1">Batal</button>' +
      '<button class="danger" id="dlg-ok">' + esc(okLabel) + '</button></div></div></div>';
    const close = () => (root.innerHTML = '');
    $$('[data-close]', root).forEach((b) => b.addEventListener('click', close));
    $('#dlg-ok', root).addEventListener('click', () => { close(); onOk(); });
  }

  /* ---------------- data layer ---------------- */
  const DEFAULT_CATEGORIES = [
    { name: 'Logam Mulia & Perhiasan', icon: '🪙', color: '#D9B368' },
    { name: 'Elektronik & Gadget', icon: '📱', color: '#3E7CB1' },
    { name: 'Hobi & Koleksi', icon: '⌚', color: '#12A594' },
    { name: 'Perlengkapan Rumah', icon: '🛋️', color: '#8C7BD8' },
    { name: 'Dokumen & Sertifikat', icon: '📜', color: '#C87941' },
    { name: 'Kendaraan', icon: '🚗', color: '#5A6B7D' }
  ];
  const PALETTE = ['#D9B368', '#3E7CB1', '#12A594', '#8C7BD8', '#C87941', '#5A6B7D', '#E06C75', '#4FA36B'];

  const DEMO_ITEMS = [
    // Logam Mulia & Perhiasan — 45.000.000
    ['Emas Antam 10 gram', 'Logam Mulia & Perhiasan', 13500000, '2023-02-14', 'Bersertifikat Antam, simpan di brankas'],
    ['Emas Antam 5 gram', 'Logam Mulia & Perhiasan', 6800000, '2021-08-09', 'Pecahan 5 gr, kondisi mulus'],
    ['Cincin Emas 22K', 'Logam Mulia & Perhiasan', 4700000, '2019-11-22', 'Beli di toko emas Melati'],
    ['Kalung Emas 24K', 'Logam Mulia & Perhiasan', 12500000, '2022-05-30', 'Hadiah pernikahan'],
    ['Gelang Emas', 'Logam Mulia & Perhiasan', 7500000, '2020-03-17', ''],
    // Elektronik & Gadget — 28.000.000
    ['iPhone 15 Pro 256GB', 'Elektronik & Gadget', 15000000, '2023-12-12', 'IMEI 35xxxx, garansi iBox'],
    ['iPad Air M2 11"', 'Elektronik & Gadget', 7500000, '2024-05-20', 'Wi-Fi 128GB'],
    ['Apple Watch Series 9', 'Elektronik & Gadget', 3000000, '2024-01-08', ''],
    ['Sony WH-1000XM5', 'Elektronik & Gadget', 2500000, '2023-07-03', 'Headphone noise cancelling'],
    // Hobi & Koleksi — 18.000.000
    ['Jam Tangan Seiko Prospex', 'Hobi & Koleksi', 5500000, '2022-04-02', 'Seri SRPD, box lengkap'],
    ['Sepeda Lipat Brompton', 'Hobi & Koleksi', 9500000, '2021-09-15', 'Nomor rangka BX-xx'],
    ['Kamera Fujifilm X-T30', 'Hobi & Koleksi', 3000000, '2019-06-11', 'Body only'],
    // Perlengkapan Rumah — 9.000.000
    ['Kulkas Samsung 2 Pintu', 'Perlengkapan Rumah', 2400000, '2020-01-20', ''],
    ['Mesin Cuci LG 8kg', 'Perlengkapan Rumah', 1800000, '2020-01-20', ''],
    ['AC Sharp 1 PK', 'Perlengkapan Rumah', 1500000, '2021-03-05', 'Kamar utama'],
    ['TV LED 43 inch', 'Perlengkapan Rumah', 900000, '2019-07-14', ''],
    ['Sofa Tamu 3 Dudukan', 'Perlengkapan Rumah', 750000, '2018-12-01', ''],
    ['Meja Makan Kayu Jati', 'Perlengkapan Rumah', 450000, '2018-12-01', ''],
    ['Lemari Pakaian 3 Pintu', 'Perlengkapan Rumah', 400000, '2019-02-18', ''],
    ['Kompor Gas Rinnai', 'Perlengkapan Rumah', 300000, '2020-06-09', ''],
    ['Rice Cooker Miyako', 'Perlengkapan Rumah', 150000, '2021-11-11', ''],
    ['Blender Philips', 'Perlengkapan Rumah', 100000, '2021-11-11', ''],
    ['Set Peralatan Makan', 'Perlengkapan Rumah', 150000, '2018-10-05', ''],
    ['Vacuum Cleaner', 'Perlengkapan Rumah', 100000, '2022-08-22', '']
  ];

  const Local = {
    read() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } },
    write(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); },
    seedIfEmpty() {
      let db = Local.read();
      if (db) return db;
      const cats = DEFAULT_CATEGORIES.map((c, i) => ({ id: 'cat' + (i + 1), name: c.name, icon: c.icon, color: c.color, created_at: new Date().toISOString() }));
      const byName = {}; cats.forEach((c) => (byName[c.name] = c.id));
      const items = DEMO_ITEMS.map((r, i) => ({
        id: 'itm' + (i + 1), category_id: byName[r[1]], item_name: r[0],
        purchase_price: r[2], purchase_date: r[3], notes: r[4], image_url: null,
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }));
      db = { users: [], categories: cats, items: items, photoCount: 0 };
      Local.write(db);
      return db;
    }
  };

  /* Cloud adapter (Supabase) */
  let sb = null;
  function cloud() {
    if (!CLOUD) return null;
    if (!sb && window.supabase) {
      sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    }
    return sb;
  }

  const Store = {
    mode: CLOUD ? 'cloud' : 'local',
    user: null,

    /* ---- auth ---- */
    async session() {
      if (this.mode === 'cloud') {
        const c = cloud();
        const { data } = await c.auth.getSession();
        if (data && data.session) {
          const u = data.session.user;
          this.user = { id: u.id, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || '').split('@')[0], email: u.email, provider: (u.app_metadata && u.app_metadata.provider) || 'email' };
          return this.user;
        }
        return null;
      }
      try {
        const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null');
        if (s) { this.user = s; return s; }
      } catch (e) { }
      return null;
    },

    async signUpEmail(name, email, pass) {
      if (this.mode === 'cloud') {
        const { data, error } = await cloud().auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
        if (error) throw error;
        if (!data.session) { const e = new Error('Cek email Anda untuk konfirmasi pendaftaran, lalu masuk kembali.'); e.code = 'confirm'; throw e; }
        return this.session();
      }
      const db = Local.seedIfEmpty();
      const u = { id: 'local-' + uid(), name: name || email.split('@')[0], email: email, provider: 'email', created_at: new Date().toISOString() };
      db.users = db.users || []; db.users.push(u); Local.write(db);
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      this.user = u;
      this.seedUserCategories(u.id);
      return u;
    },

    async signInEmail(email, pass) {
      if (this.mode === 'cloud') {
        const { error } = await cloud().auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        return this.session();
      }
      const db = Local.seedIfEmpty();
      const u = (db.users || []).find((x) => x.email.toLowerCase() === email.toLowerCase());
      if (!u) {
        // demo: auto-provision supaya alur tidak macet
        return this.signUpEmail(email.split('@')[0], email, pass);
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      this.user = u;
      return u;
    },

    async signInGoogle() {
      if (this.mode === 'cloud') {
        const { error } = await cloud().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
        if (error) throw error;
        return null;
      }
      const u = { id: 'demo-google', name: 'Rangga Pratama', email: 'rangga.demo@gmail.com', provider: 'google' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      this.user = u;
      return u;
    },

    async signOut() {
      if (this.mode === 'cloud') { try { await cloud().auth.signOut(); } catch (e) { } }
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      this.user = null;
    },

    seedUserCategories() { /* mode demo: kategori dipakai bersama di perangkat ini */ },

    /* ---- read ---- */
    async categories() {
      if (this.mode === 'cloud') {
        const { data, error } = await cloud().from('categories').select('*').order('created_at');
        if (error) throw error;
        if (!data.length) {
          const seed = DEFAULT_CATEGORIES.map((c) => ({ user_id: this.user.id, name: c.name, icon: c.icon, color: c.color }));
          const ins = await cloud().from('categories').insert(seed).select();
          return ins.data || [];
        }
        return data;
      }
      const db = Local.seedIfEmpty();
      return db.categories;
    },

    async items() {
      if (this.mode === 'cloud') {
        const { data, error } = await cloud().from('items').select('*').order('purchase_date', { ascending: false });
        if (error) throw error;
        return data;
      }
      const db = Local.seedIfEmpty();
      return db.items;
    },

    /* ---- write ---- */
    async addCategory(name) {
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      if (this.mode === 'cloud') {
        const { data, error } = await cloud().from('categories').insert({ user_id: this.user.id, name: name, icon: '📦', color: color }).select().single();
        if (error) throw error;
        return data;
      }
      const db = Local.read();
      const c = { id: 'cat-' + uid(), user_id: this.user.id, name: name, icon: '📦', color: color, created_at: new Date().toISOString() };
      db.categories.push(c); Local.write(db);
      return c;
    },

    async saveItem(it) {
      if (this.mode === 'cloud') {
        const payload = {
          user_id: this.user.id, category_id: it.category_id, item_name: it.item_name,
          purchase_price: it.purchase_price, purchase_date: it.purchase_date,
          image_url: it.image_url || null, notes: it.notes || null
        };
        if (it.id) {
          const { data, error } = await cloud().from('items').update(payload).eq('id', it.id).select().single();
          if (error) throw error; return data;
        }
        const { data, error } = await cloud().from('items').insert(payload).select().single();
        if (error) throw error; return data;
      }
      const db = Local.read();
      if (it.id) {
        const i = db.items.findIndex((x) => x.id === it.id);
        db.items[i] = Object.assign(db.items[i], it);
      } else {
        db.items.push(Object.assign({ id: 'itm-' + uid(), user_id: this.user ? this.user.id : null, created_at: new Date().toISOString() }, it));
      }
      Local.write(db);
      return it;
    },

    async deleteItem(id) {
      if (this.mode === 'cloud') {
        const { error } = await cloud().from('items').delete().eq('id', id);
        if (error) throw error; return;
      }
      const db = Local.read();
      db.items = db.items.filter((x) => x.id !== id); Local.write(db);
    },

    async uploadPhoto(dataUrl) {
      if (!dataUrl) return null;
      if (this.mode !== 'cloud') return dataUrl; // dataURL disimpan langsung
      const c = cloud();
      const blob = await (await fetch(dataUrl)).blob();
      const path = this.user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
      const up = await c.storage.from(CFG.BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const pub = c.storage.from(CFG.BUCKET).getPublicUrl(path);
      return pub.data.publicUrl;
    }
  };

  /* ---------------- app state ---------------- */
  const state = { cats: [], items: [], activeCat: null, chart: null, photoData: null, editingId: null };

  const totalsByCat = () => {
    const map = {};
    state.cats.forEach((c) => (map[c.id] = { cat: c, count: 0, total: 0 }));
    state.items.forEach((it) => {
      const k = it.category_id;
      if (!map[k]) map[k] = { cat: { id: k, name: 'Tanpa Kategori', icon: '📦', color: '#93A1B1' }, count: 0, total: 0 };
      map[k].count++;
      map[k].total += Number(it.purchase_price) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  };
  const grandTotal = () => state.items.reduce((s, i) => s + (Number(i.purchase_price) || 0), 0);

  /* ---------------- screens ---------------- */
  function show(screen) {
    ['#screen-login', '#screen-dash', '#screen-cat'].forEach((s) => $(s).classList.add('hidden'));
    $(screen).classList.remove('hidden');
  }

  /* ---------------- dashboard ---------------- */
  function renderDash() {
    const u = Store.user || { name: 'Pengguna' };
    $('#dash-name').textContent = u.name || 'Pengguna';
    $('#dash-avatar').textContent = (u.name || 'P').trim().charAt(0).toUpperCase();
    const total = grandTotal();
    $('#hero-total').innerHTML = '<span class="rp">Rp</span>' + nf.format(total);
    $('#hero-count').textContent = state.items.length + ' item';
    const rows = totalsByCat().filter((r) => r.count > 0);
    $('#hero-cats').textContent = rows.length;
    $('#hero-avg').textContent = Rp(state.items.length ? total / state.items.length : 0);
    $('#pie-sub').textContent = rows.length + ' kategori berisi aset';

    // table
    const tb = $('#tbl-dash-body');
    if (!rows.length) {
      tb.innerHTML = '';
      $('#dash-empty').classList.remove('hidden');
    } else {
      $('#dash-empty').classList.add('hidden');
      tb.innerHTML = rows.map((r) => {
        const pct = total ? Math.round((r.total / total) * 100) : 0;
        return '<tr data-cat="' + esc(r.cat.id) + '">' +
          '<td><div class="cat-nm"><span class="dot" style="background:' + esc(r.cat.color || '#93A1B1') + '"></span><span>' + esc(r.cat.name) + '</span></div></td>' +
          '<td class="r"><span class="badge-n">' + r.count + '</span></td>' +
          '<td class="r num">' + Rp(r.total) + '</td>' +
          '<td class="r num">' + pct + '%</td></tr>';
      }).join('');
      $$('#tbl-dash-body tr').forEach((tr) => tr.addEventListener('click', () => openCat(tr.dataset.cat)));
    }
    $('#tf-items').textContent = state.items.length;
    $('#tf-total').textContent = Rp(total);

    // legend
    $('#legend').innerHTML = rows.slice(0, 6).map((r) => '<li><span class="dot" style="background:' + esc(r.cat.color || '#93A1B1') + '"></span><span class="nm">' + esc(r.cat.name) + '</span><span class="pc">' + (total ? Math.round((r.total / total) * 100) : 0) + '%</span></li>').join('') || '<li style="color:#93A1B1">Belum ada data</li>';

    drawPie(rows, total);

    // category cards
    $('#cat-cards').innerHTML = state.cats.map((c) => {
      const r = rows.find((x) => x.cat.id === c.id) || { count: 0, total: 0 };
      const pct = total ? Math.round((r.total / total) * 100) : 0;
      return '<button class="cat-card" data-cat="' + esc(c.id) + '">' +
        '<span class="cat-ico" style="background:' + hexA(c.color, .13) + '">' + (c.icon || '📦') + '</span>' +
        '<span style="min-width:0"><span class="cn" style="display:block">' + esc(c.name) + '</span><span class="cs">' + r.count + ' item</span></span>' +
        '<span class="cv">' + RpShort(r.total) + '<small>' + pct + '%</small></span></button>';
    }).join('');
    $$('#cat-cards .cat-card').forEach((b) => b.addEventListener('click', () => openCat(b.dataset.cat)));

    // sync note
    if (Store.mode === 'cloud') {
      $('#sync-title').textContent = 'Tersinkron ke cloud';
      $('#sync-desc').textContent = 'Terhubung ke Supabase sebagai ' + (u.email || '') + '. Data tersimpan di server — aman bila perangkat hilang.';
    } else {
      $('#sync-title').textContent = 'Mode Demo — data di perangkat';
      $('#sync-desc').textContent = 'Data tersimpan di penyimpanan lokal browser ini. Isi SUPABASE_URL & ANON_KEY di src/config.js agar tersinkron ke cloud.';
    }
  }

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return 'rgba(147,161,177,' + a + ')';
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function drawPie(rows, total) {
    const cv = $('#pie');
    if (!window.Chart) return;
    if (state.chart) {
      const empty = !rows.length;
      state.chart.data.labels = empty ? ['Belum ada'] : rows.map((r) => r.cat.name);
      state.chart.data.datasets[0].data = empty ? [1] : rows.map((r) => r.total);
      state.chart.data.datasets[0].backgroundColor = empty ? ['#EDF1F7'] : rows.map((r) => r.cat.color || '#93A1B1');
      state.chart.update();
      return;
    }
    if (!rows.length) {
      state.chart = new Chart(cv, { type: 'doughnut', data: { labels: ['Belum ada'], datasets: [{ data: [1], backgroundColor: ['#EDF1F7'], borderWidth: 0 }] }, options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, responsive: true, maintainAspectRatio: false, animation: false } });
      return;
    }
    state.chart = new Chart(cv, {
      type: 'doughnut',
      data: { labels: rows.map((r) => r.cat.name), datasets: [{ data: rows.map((r) => r.total), backgroundColor: rows.map((r) => r.cat.color || '#93A1B1'), borderWidth: 0, hoverOffset: 4 }] },
      options: {
        cutout: '72%', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + Rp(c.parsed) + ' (' + (total ? Math.round((c.parsed / total) * 100) : 0) + '%)' } }
        }
      }
    });
  }

  /* ---------------- category screen ---------------- */
  function openCat(catId) {
    state.activeCat = catId;
    const c = state.cats.find((x) => x.id === catId) || { id: catId, name: 'Tanpa Kategori', icon: '📦' };
    const items = state.items.filter((i) => i.category_id === catId)
      .sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
    const total = items.reduce((s, i) => s + (Number(i.purchase_price) || 0), 0);
    $('#cat-title').textContent = c.name;
    $('#cat-sub').textContent = items.length + ' item · dibeli ' + (items.length ? fmtMonthYear(items[items.length - 1].purchase_date) + ' – ' + fmtMonthYear(items[0].purchase_date) : '—');
    $('#cat-total').textContent = Rp(total);
    $('#cat-count-strip').textContent = items.length;

    const box = $('#cat-items');
    if (!items.length) { box.innerHTML = ''; $('#cat-empty').classList.remove('hidden'); }
    else {
      $('#cat-empty').classList.add('hidden');
      box.innerHTML = items.map((it) => {
        const img = it.image_url ? '<div class="thumb"><img src="' + esc(it.image_url) + '" alt=""></div>' : '<div class="thumb">🖼️</div>';
        return '<div class="item-row" data-id="' + esc(it.id) + '">' + img +
          '<div style="min-width:0;flex:1">' +
          '<div class="item-nm">' + esc(it.item_name) + '</div>' +
          '<div class="item-meta"><span>Dibeli ' + fmtMonthYear(it.purchase_date) + '</span></div>' +
          (it.notes ? '<div class="item-note">' + esc(it.notes) + '</div>' : '') +
          '</div>' +
          '<div class="item-price">' + Rp(it.purchase_price) + '</div>' +
          '<div class="row-actions">' +
          '<button class="mini" data-act="edit" title="Ubah"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>' +
          '<button class="mini" data-act="del" title="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>' +
          '</div></div>';
      }).join('');
      $$('#cat-items .item-row').forEach((row) => {
        const id = row.dataset.id;
        $('[data-act="edit"]', row).addEventListener('click', () => openForm(id));
        $('[data-act="del"]', row).addEventListener('click', () => {
          const it = state.items.find((x) => x.id === id);
          confirmDialog('Hapus barang?', '"' + (it ? it.item_name : 'Barang') + '" akan dihapus dari catatan aset Anda.', 'Hapus', async () => {
            await Store.deleteItem(id);
            await refresh();
            toast('Barang dihapus');
            openCat(catId);
          });
        });
      });
    }
    show('#screen-cat');
    $('#cat-scroll').scrollTop = 0;
  }

  /* ---------------- form ---------------- */
  function fillCatOptions(selected) {
    const sel = $('#in-item-cat');
    sel.innerHTML = state.cats.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('\n');
  }

  function openForm(itemId, presetCat) {
    state.editingId = itemId || null;
    state.photoData = null;
    const it = itemId ? state.items.find((x) => x.id === itemId) : null;
    $('#sheet-title').textContent = it ? 'Ubah Data Barang' : 'Tambah Barang Baru';
    $('#sheet-save').textContent = it ? 'Simpan Perubahan' : 'Simpan ke Aset Saya';
    fillCatOptions(it ? it.category_id : (presetCat || (state.cats[0] && state.cats[0].id)));
    $('#in-item-name').value = it ? it.item_name : '';
    $('#in-price').value = it ? nf.format(it.purchase_price) : '';
    $('#in-date').value = it ? it.purchase_date : todayISO();
    $('#in-notes').value = it ? (it.notes || '') : '';
    $('#in-item-id').value = it ? it.id : '';
    // photo
    const prev = $('#photo-preview'), ph = $('#photo-placeholder'), rm = $('#photo-rm'), box = $('#photo-box');
    if (it && it.image_url) {
      state.photoData = it.image_url;
      prev.src = it.image_url; prev.classList.remove('hidden'); ph.classList.add('hidden'); rm.classList.remove('hidden'); box.classList.add('has');
    } else {
      prev.src = ''; prev.classList.add('hidden'); ph.classList.remove('hidden'); rm.classList.add('hidden'); box.classList.remove('has');
    }
    $('#sheet').classList.remove('hidden');
    setTimeout(() => $('#in-item-name').focus(), 250);
  }
  function closeForm() { $('#sheet').classList.add('hidden'); state.editingId = null; state.photoData = null; }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900;
          let w = img.width, h = img.height;
          if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
          else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = r.result;
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function saveItemFromForm() {
    const name = $('#in-item-name').value.trim();
    const cat = $('#in-item-cat').value;
    const price = Number(String($('#in-price').value).replace(/[^\d]/g, ''));
    const date = $('#in-date').value;
    const notes = $('#in-notes').value.trim();
    if (!name) return toast('Nama barang wajib diisi');
    if (!cat) return toast('Pilih kategori dulu');
    if (!price || price <= 0) return toast('Harga beli harus lebih dari 0');
    if (!date) return toast('Tanggal beli wajib diisi');
    const btn = $('#sheet-save'); const old = btn.textContent;
    btn.textContent = 'Menyimpan...'; btn.disabled = true;
    try {
      const image_url = await Store.uploadPhoto(state.photoData);
      await Store.saveItem({
        id: state.editingId, category_id: cat, item_name: name,
        purchase_price: price, purchase_date: date, notes: notes, image_url: image_url
      });
      const wasEdit = !!state.editingId;
      const backCat = cat;
      closeForm();
      await refresh();
      toast(wasEdit ? 'Perubahan tersimpan' : 'Barang ditambahkan ke aset Anda');
      if (!$('#screen-cat').classList.contains('hidden')) openCat(backCat);
    } catch (e) {
      console.error(e);
      toast('Gagal menyimpan: ' + (e.message || 'coba lagi'));
    } finally { btn.textContent = old; btn.disabled = false; }
  }

  /* ---------------- exports ---------------- */
  function exportData(scope) {
    // scope: {type:'all'} | {type:'cat', id}
    let rows;
    let title;
    let sub;
    if (scope.type === 'cat') {
      const c = state.cats.find((x) => x.id === scope.id) || { name: 'Kategori' };
      title = c.name;
      const items = state.items.filter((i) => i.category_id === scope.id).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
      sub = items.length + ' item';
      rows = items.map((i) => ({ name: i.item_name, date: i.purchase_date, notes: i.notes || '', price: Number(i.purchase_price) || 0, cat: c.name }));
    } else {
      title = 'Portofolio Aset Fisik Pribadi';
      sub = state.items.length + ' item · ' + totalsByCat().filter((r) => r.count > 0).length + ' kategori';
      rows = state.items.slice().sort((a, b) => (b.purchase_price || 0) - (a.purchase_price || 0)).map((i) => {
        const c = state.cats.find((x) => x.id === i.category_id) || { name: 'Tanpa Kategori' };
        return { name: i.item_name, date: i.purchase_date, notes: i.notes || '', price: Number(i.purchase_price) || 0, cat: c.name };
      });
    }
    const total = rows.reduce((s, r) => s + r.price, 0);
    return { rows, total, title, sub, user: Store.user || { name: 'Pengguna' } };
  }

  function exportPDF(scope) {
    const { rows, total, title, user } = exportData(scope);
    if (!rows.length) return toast('Tidak ada data untuk diekspor');
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) return toast('Pustaka PDF belum termuat');
    const doc = new J({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(11, 27, 43); doc.rect(0, 0, W, 108, 'F');
    doc.setFillColor(217, 179, 104); doc.rect(0, 104, W, 4, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
    doc.text('SimpAset', 40, 44);
    doc.setFontSize(10); doc.setTextColor(180, 197, 214); doc.setFont('helvetica', 'normal');
    doc.text('Physical Asset Tracker', 40, 60);
    doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text(String(title).slice(0, 62), 40, 86);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(190, 205, 220);
    doc.text('Dibuat ' + new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + ' · Pemilik: ' + (user.name || '-'), W - 40, 60, { align: 'right' });

    // total box
    doc.setFillColor(244, 246, 250); doc.roundedRect(40, 124, W - 80, 52, 8, 8, 'F');
    doc.setTextColor(107, 122, 141); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ASET FISIK', 54, 143);
    doc.setTextColor(11, 27, 43); doc.setFontSize(18);
    doc.text('Rp ' + nf.format(total), 54, 164);
    doc.setTextColor(107, 122, 141); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(rows.length + ' item tercatat', W - 54, 164, { align: 'right' });

    const body = rows.map((r, i) => [String(i + 1), r.name, r.cat, r.date ? fmtDate(r.date) : '-', 'Rp ' + nf.format(r.price)]);
    const ok = doc.autoTable({
      startY: 190,
      head: [['#', 'Nama Barang', 'Kategori', 'Tanggal Beli', 'Harga Beli']],
      body: body,
      foot: [['', '', '', 'TOTAL', 'Rp ' + nf.format(total)]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, lineColor: [231, 236, 243], lineWidth: 0.5, textColor: [30, 45, 60] },
      headStyles: { fillColor: [16, 48, 73], textColor: 255, fontSize: 8, halign: 'left' },
      footStyles: { fillColor: [244, 246, 250], textColor: [11, 27, 43], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: [250, 251, 253] },
      columnStyles: { 0: { cellWidth: 22 }, 4: { halign: 'right', cellWidth: 88 }, 3: { cellWidth: 70 } },
      didParseCell: (d) => { if (d.section === 'body' && d.column.index === 4) d.cell.styles.halign = 'right'; }
    });

    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5); doc.setTextColor(147, 161, 177); doc.setFont('helvetica', 'normal');
      doc.text('SimpAset — catatan nilai pembelian, bukan taksiran harga jual.', 40, H - 26);
      doc.text('Halaman ' + p + ' / ' + pages, W - 40, H - 26, { align: 'right' });
    }
    const fn = 'SimpAset-' + String(title).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + todayISO() + '.pdf';
    doc.save(fn);
    toast('PDF berhasil diunduh');
  }

  function exportExcel(scope) {
    const { rows, total, title } = exportData(scope);
    if (!rows.length) return toast('Tidak ada data untuk diekspor');
    if (!window.XLSX) return toast('Pustaka Excel belum termuat');
    const head = [['SimpAset — ' + title], ['Diekspor', new Date().toLocaleString('id-ID')], [], ['No', 'Nama Barang', 'Kategori', 'Tanggal Beli', 'Harga Beli (Rp)', 'Catatan']];
    const body = rows.map((r, i) => [i + 1, r.name, r.cat, r.date || '', r.price, r.notes]);
    const foot = [['', '', '', 'TOTAL', total, '']];
    const aoa = head.concat(body, foot);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 5 }, { wch: 34 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 40 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    // number format for price col
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 4; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: 4 })];
      if (cell && typeof cell.v === 'number') { cell.z = '#,##0'; cell.t = 'n'; }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aset Fisik');

    // ringkasan per kategori
    const byCat = {};
    rows.forEach((r) => { byCat[r.cat] = byCat[r.cat] || { n: 0, t: 0 }; byCat[r.cat].n++; byCat[r.cat].t += r.price; });
    const sumAoa = [['Kategori', 'Jumlah Item', 'Total Nilai Pembelian', 'Persentase']].concat(
      Object.keys(byCat).sort((a, b) => byCat[b].t - byCat[a].t).map((k) => [k, byCat[k].n, byCat[k].t, total ? Math.round(byCat[k].t / total * 100) + '%' : '0%'])
    ).concat([['TOTAL ASET FISIK', rows.length, total, '100%']]);
    const ws2 = XLSX.utils.aoa_to_sheet(sumAoa);
    ws2['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 12 }];
    const r2 = XLSX.utils.decode_range(ws2['!ref']);
    for (let R = 1; R <= r2.e.r; R++) {
      const cell = ws2[XLSX.utils.encode_cell({ r: R, c: 2 })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0';
    }
    XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan Kategori');

    const fn = 'SimpAset-' + String(title).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + todayISO() + '.xlsx';
    XLSX.writeFile(wb, fn);
    toast('Excel berhasil diunduh');
  }

  async function exportPNG(scope) {
    const { rows, total, title, sub, user } = exportData(scope);
    if (!rows.length) return toast('Tidak ada data untuk diekspor');
    if (!window.html2canvas) return toast('Pustaka gambar belum termuat');
    const byCat = {};
    rows.forEach((r) => { byCat[r.cat] = byCat[r.cat] || { n: 0, t: 0 }; byCat[r.cat].n++; byCat[r.cat].t += r.price; });
    const catRows = Object.keys(byCat).sort((a, b) => byCat[b].t - byCat[a].t);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:840px;background:#F4F6FA;padding:34px;font-family:Inter,Arial,Helvetica,sans-serif;color:#0F1E2E;position:fixed;left:-9999px;top:0';
    wrap.innerHTML =
      '<div style="background:linear-gradient(135deg,#122A40,#0B1B2B);border-radius:22px;padding:26px 28px;color:#fff">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
      '<div><div style="font-size:20px;font-weight:800;letter-spacing:-.4px">Simp<span style="color:#D9B368">Aset</span></div>' +
      '<div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8FA3B8;margin-top:3px">Physical Asset Tracker</div></div>' +
      '<div style="text-align:right;font-size:10.5px;color:#9FB2C6;line-height:1.6">' + esc(user.name) + '<br>' + new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) + '</div></div>' +
      '<div style="font-size:11px;color:#9FB2C6;margin-top:22px;font-weight:600">' + esc(title) + '</div>' +
      '<div style="font-size:36px;font-weight:800;letter-spacing:-1.4px;margin-top:2px">Rp ' + nf.format(total) + '</div>' +
      '<div style="font-size:11px;color:#8FA3B8;margin-top:4px">' + esc(sub) + '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:18px 20px;margin-top:14px">' +
      '<div style="font-size:12px;font-weight:800;margin-bottom:10px">Rincian per Kategori</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:11.5px">' +
      '<thead><tr style="color:#93A1B1;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em">' +
      '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #E7ECF3">Kategori</th>' +
      '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #E7ECF3">Item</th>' +
      '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #E7ECF3">Total Nilai</th>' +
      '<th style="text-align:right;padding:6px 4px;border-bottom:1px solid #E7ECF3">%</th></tr></thead><tbody>' +
      catRows.map((k) => '<tr><td style="padding:9px 4px;border-bottom:1px solid #F1F4F9;font-weight:700">' + esc(k) + '</td>' +
        '<td style="padding:9px 4px;border-bottom:1px solid #F1F4F9;text-align:right">' + byCat[k].n + '</td>' +
        '<td style="padding:9px 4px;border-bottom:1px solid #F1F4F9;text-align:right;font-weight:700">' + Rp(byCat[k].t) + '</td>' +
        '<td style="padding:9px 4px;border-bottom:1px solid #F1F4F9;text-align:right;color:#6B7A8D">' + (total ? Math.round(byCat[k].t / total * 100) : 0) + '%</td></tr>').join('') +
      '</tbody><tfoot><tr><td style="padding:11px 4px;font-weight:800;font-size:10px;letter-spacing:.05em;text-transform:uppercase;border-top:1.5px solid #E7ECF3">Total Aset Fisik</td>' +
      '<td style="padding:11px 4px;text-align:right;font-weight:800;border-top:1.5px solid #E7ECF3">' + rows.length + '</td>' +
      '<td style="padding:11px 4px;text-align:right;font-weight:800;border-top:1.5px solid #E7ECF3">' + Rp(total) + '</td>' +
      '<td style="padding:11px 4px;text-align:right;font-weight:800;border-top:1.5px solid #E7ECF3">100%</td></tr></tfoot></table></div>' +
      '<div style="background:#fff;border-radius:18px;padding:18px 20px;margin-top:14px">' +
      '<div style="font-size:12px;font-weight:800;margin-bottom:8px">Daftar Barang (' + rows.length + ')</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:10.5px">' +
      rows.slice(0, 40).map((r, i) => '<tr><td style="padding:7px 4px;border-bottom:1px solid #F4F6FA;color:#93A1B1;width:22px">' + (i + 1) + '</td>' +
        '<td style="padding:7px 4px;border-bottom:1px solid #F4F6FA"><b>' + esc(r.name) + '</b><div style="color:#93A1B1;font-size:9.5px;margin-top:2px">' + esc(r.cat) + ' · ' + (r.date ? fmtMonthYear(r.date) : '-') + '</div></td>' +
        '<td style="padding:7px 4px;border-bottom:1px solid #F4F6FA;text-align:right;font-weight:700;white-space:nowrap">' + Rp(r.price) + '</td></tr>').join('') +
      (rows.length > 40 ? '<tr><td colspan="3" style="padding:8px 4px;color:#93A1B1">… dan ' + (rows.length - 40) + ' barang lainnya (lihat ekspor PDF/Excel)</td></tr>' : '') +
      '</table></div>' +
      '<div style="font-size:9.5px;color:#93A1B1;text-align:center;margin-top:14px;line-height:1.5">SimpAset mencatat nilai pembelian — bukan taksiran harga jual.<br>Dibuat otomatis dari catatan pribadi Anda.</div>';
    document.body.appendChild(wrap);
    try {
      const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: '#F4F6FA', useCORS: true, logging: false });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'SimpAset-' + String(title).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + todayISO() + '.png';
      a.click();
      toast('Gambar PNG berhasil diunduh');
    } catch (e) {
      console.error(e); toast('Gagal membuat gambar: ' + (e.message || ''));
    } finally { wrap.remove(); }
  }

  /* ---------------- refresh ---------------- */
  async function refresh() {
    state.cats = await Store.categories();
    state.items = await Store.items();
    renderDash();
  }

  /* ---------------- boot ---------------- */
  function afterLogin() {
    show('#screen-dash');
    refresh().catch((e) => { console.error(e); toast('Gagal memuat data: ' + e.message); });
  }

  function initEvents() {
    // login
    $('#btn-tab-email').addEventListener('click', () => $('#email-form').classList.toggle('hidden'));

    $('#btn-google').addEventListener('click', async () => {
      try {
        const u = await Store.signInGoogle();
        if (u) { toast(Store.mode === 'cloud' ? 'Masuk dengan Google' : 'Mode demo: masuk sebagai akun contoh'); afterLogin(); }
        else toast('Mengalihkan ke Google...');
      } catch (e) { toast('Gagal masuk: ' + e.message); }
    });

    $('#btn-email-submit').addEventListener('click', async () => {
      const name = $('#in-name').value.trim();
      const email = $('#in-email').value.trim();
      const pass = $('#in-pass').value;
      if (!email || email.indexOf('@') < 0) return toast('Email tidak valid');
      if (pass.length < 6) return toast('Kata sandi minimal 6 karakter');
      const btn = $('#btn-email-submit'); const old = btn.textContent;
      btn.textContent = 'Memproses...'; btn.disabled = true;
      try {
        let u;
        try { u = await Store.signInEmail(email, pass); }
        catch (e) { u = await Store.signUpEmail(name, email, pass); }
        if (u) { afterLogin(); toast('Selamat datang, ' + (u.name || 'Pengguna')); }
        else toast('Cek email Anda untuk konfirmasi, lalu masuk kembali.');
      } catch (e) {
        toast(e.code === 'confirm' ? e.message : 'Gagal masuk: ' + e.message);
      } finally { btn.textContent = old; btn.disabled = false; }
    });

    $('#btn-demo').addEventListener('click', async () => {
      const u = { id: 'demo-local', name: 'Rangga Pratama', email: 'rangga.demo@gmail.com', provider: 'demo' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      Store.user = u;
      afterLogin();
      toast('Mode Demo aktif dengan 24 contoh aset');
    });

    // dashboard
    $('#fab-add').addEventListener('click', () => openForm(null));
    $('#chip-add').addEventListener('click', () => openForm(null));
    $('#cat-back').addEventListener('click', () => { show('#screen-dash'); refresh(); });
    $('#fab-cat-add').addEventListener('click', () => openForm(null, state.activeCat));

    $('#chip-pdf').addEventListener('click', () => exportPDF({ type: 'all' }));
    $('#chip-xls').addEventListener('click', () => exportExcel({ type: 'all' }));
    $('#chip-png').addEventListener('click', () => exportPNG({ type: 'all' }));
    $('#cat-pdf').addEventListener('click', () => exportPDF({ type: 'cat', id: state.activeCat }));
    $('#cat-xls').addEventListener('click', () => exportExcel({ type: 'cat', id: state.activeCat }));
    $('#cat-png').addEventListener('click', () => exportPNG({ type: 'cat', id: state.activeCat }));

    $('#btn-add-cat').addEventListener('click', () => {
      const name = prompt('Nama kategori baru:');
      if (!name || !name.trim()) return;
      Store.addCategory(name.trim()).then(async () => { await refresh(); toast('Kategori ditambahkan'); });
    });

    $('#btn-logout').addEventListener('click', () => {
      confirmDialog('Keluar dari akun?', 'Data Anda tetap tersimpan dan akan dimuat kembali saat masuk lagi.', 'Keluar', async () => {
        await Store.signOut();
        state.chart = null;
        show('#screen-login');
        $('#email-form').classList.add('hidden');
        toast('Anda telah keluar');
      });
    });

    $('#btn-sync').addEventListener('click', () => {
      toast(Store.mode === 'cloud' ? 'Tersinkron ke Supabase cloud' : 'Mode demo — data lokal di perangkat ini');
    });

    // sheet
    $('#sheet-bg').addEventListener('click', closeForm);
    $('#sheet-close').addEventListener('click', closeForm);
    $('#sheet-cancel').addEventListener('click', closeForm);
    $('#sheet-save').addEventListener('click', saveItemFromForm);

    $('#in-photo').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const d = await compressImage(f);
        state.photoData = d;
        const prev = $('#photo-preview');
        prev.src = d; prev.classList.remove('hidden');
        $('#photo-placeholder').classList.add('hidden');
        $('#photo-rm').classList.remove('hidden');
        $('#photo-box').classList.add('has');
      } catch (err) { toast('Foto gagal dibaca'); }
      e.target.value = '';
    });
    $('#photo-rm').addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      state.photoData = null;
      $('#photo-preview').classList.add('hidden');
      $('#photo-placeholder').classList.remove('hidden');
      $('#photo-rm').classList.add('hidden');
      $('#photo-box').classList.remove('has');
    });

    // price formatting as you type
    $('#in-price').addEventListener('input', (e) => {
      const digits = e.target.value.replace(/[^\d]/g, '');
      e.target.value = digits ? nf.format(Number(digits)) : '';
    });

    // close sheet on Escape
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').classList.contains('hidden')) closeForm(); });
  }

  async function boot() {
    initEvents();
    try {
      const u = await Store.session();
      if (u) afterLogin();
    } catch (e) { console.warn(e); }
    if (CLOUD && sb) {
      sb.auth.onAuthStateChange((evt, sess) => { if (evt === 'SIGNED_IN' && sess) { Store.session().then(() => afterLogin()); } });
    }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
