/* ═══════════════════════════════════════════════════════════
   VETERİNER REHBERİ - SCRIPT
   Veri URL'sini window.VETRH_DATA_URL üzerinden okur.
   ═══════════════════════════════════════════════════════════ */

(function() {
  var DATA_URL = (typeof window !== 'undefined' && window.VETRH_DATA_URL) ? window.VETRH_DATA_URL : 'https://ramazanmalaz.github.io/barf_vet_bul/veteriner_verileri.txt';

  var citySel       = document.getElementById('vetrh-city');
  var districtSel   = document.getElementById('vetrh-district');
  var searchInput   = document.getElementById('vetrh-search');
  var resultsEl     = document.getElementById('vetrh-results');
  var countLine     = document.getElementById('vetrh-count-line');
  var clearBtn      = document.getElementById('vetrh-clear-btn');

  function showError(title, detail) {
    resultsEl.innerHTML = '<div class="vetrh-error"><b>' + title + '</b><br>' + detail + '</div>';
    countLine.textContent = 'Veri yüklenemedi';
    citySel.innerHTML = '<option value="">Veri yüklenmedi</option>';
  }

  if (!DATA_URL || DATA_URL === 'BURAYA_URL_YAPISTIRIN') {
    showError('Veri dosyasının URL\'si ayarlanmamış.',
      'HTML\'in en üstündeki <code>window.VETRH_DATA_URL = "..."</code> satırına ' +
      'dosyanızın tam adresini yazın.');
    return;
  }

  fetch(DATA_URL, { cache: 'force-cache' })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — dosya bulunamadı');
      return r.text();
    })
    .then(function(txt) {
      var data;
      try { data = JSON.parse(txt); }
      catch (e) { throw new Error('Dosya geçerli JSON değil: ' + e.message); }
      if (!Array.isArray(data) || !data.length) throw new Error('Dosya boş veya hatalı');
      init(data);
    })
    .catch(function(err) {
      showError('Veri yüklenemedi.',
        'Tarayıcı F12 → Network sekmesinden dosya isteğini kontrol edebilirsiniz.<br><br>' +
        '<small>Hata: ' + (err.message || err) + '</small><br>' +
        '<small>Denenen URL: ' + DATA_URL + '</small>');
    });

  function init(VETS) {
    var cityIndex = {};
    var cities = [];
    var cityCounts = {};
    var currentResults = [];
    var displayedCount = 0;
    var PAGE_SIZE = 50;

    function toTitleCase(str) {
      if (!str) return '';
      return str.toLocaleLowerCase('tr-TR').split(' ').map(function(w){
        return w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1);
      }).join(' ');
    }
    function formatPhone(raw) {
      if (!raw) return '';
      var d = raw.replace(/\D/g, '');
      if (d.length === 10) return '0' + d.slice(0,3) + ' ' + d.slice(3,6) + ' ' + d.slice(6,8) + ' ' + d.slice(8,10);
      if (d.length === 11 && d.charAt(0) === '0') return d.slice(0,4) + ' ' + d.slice(4,7) + ' ' + d.slice(7,9) + ' ' + d.slice(9,11);
      return raw;
    }
    function telLink(raw) {
      if (!raw) return '';
      var d = raw.replace(/\D/g, '');
      if (d.length === 10) return '+90' + d;
      if (d.length === 11 && d.charAt(0) === '0') return '+9' + d;
      return d;
    }
    function escapeHtml(s) {
      return (s || '').replace(/[&<>"']/g, function(m){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
      });
    }
    function highlight(text, q) {
      if (!q) return escapeHtml(text);
      var escaped = escapeHtml(text);
      var parts = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split(/\s+/).filter(Boolean);
      if (!parts.length) return escaped;
      var re = new RegExp('(' + parts.join('|') + ')', 'gi');
      return escaped.replace(re, '<mark>$1</mark>');
    }
    function normalize(s) {
      return (s || '').toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
    }
    function countByCityDistrict(city, dist) {
      var n = 0;
      for (var i = 0; i < VETS.length; i++) {
        if (VETS[i].i === city && (VETS[i].d || '') === dist) n++;
      }
      return n;
    }
    function buildCard(v, q) {
      var card = document.createElement('article');
      card.className = 'vetrh-card';
      var main = document.createElement('div');
      main.className = 'vetrh-card-main';
      var html = '<div class="vetrh-card-name">' + highlight(v.n || 'İsimsiz', q) + '</div>';
      if (v.u) html += '<div class="vetrh-card-trade">' + highlight(v.u, q) + '</div>';
      html += '<div class="vetrh-card-badges">';
      if (v.d) html += '<span class="vetrh-badge">' + escapeHtml(toTitleCase(v.d)) + '</span>';
      if (v.m) html += '<span class="vetrh-badge vetrh-badge-alt">' + escapeHtml(toTitleCase(v.m)) + '</span>';
      html += '</div>';
      if (v.a) {
        html += '<div class="vetrh-card-addr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg><span>' + highlight(v.a, q) + '</span></div>';
      }
      if (v.b) html += '<div class="vetrh-card-belge">BELGE NO · ' + escapeHtml(v.b) + '</div>';
      main.innerHTML = html;
      var actions = document.createElement('div');
      actions.className = 'vetrh-card-actions';
      if (v.t) {
        var a = document.createElement('a');
        a.className = 'vetrh-action vetrh-action-primary';
        a.href = 'tel:' + telLink(v.t);
        a.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg> <span>' + formatPhone(v.t) + '</span>';
        actions.appendChild(a);
      }
      if (v.e) {
        var em = document.createElement('a');
        em.className = 'vetrh-action';
        em.href = 'mailto:' + v.e;
        em.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg> <span>E-Posta</span>';
        actions.appendChild(em);
      }
      if (v.a) {
        var mp = document.createElement('a');
        mp.className = 'vetrh-action';
        mp.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((v.a||'') + ' ' + toTitleCase(v.d||'') + ' ' + toTitleCase(v.i||''));
        mp.target = '_blank';
        mp.rel = 'noopener';
        mp.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> <span>Haritada Aç</span>';
        actions.appendChild(mp);
      }
      card.appendChild(main);
      card.appendChild(actions);
      return card;
    }
    function render(reset) {
      if (reset !== false) reset = true;
      if (reset) { displayedCount = 0; resultsEl.innerHTML = ''; }
      var q = searchInput.value.trim();
      var nq = normalize(q);
      if (reset) {
        if (!citySel.value) {
          resultsEl.innerHTML = '<div class="vetrh-empty"><div class="vetrh-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg></div><div class="vetrh-empty-title">Önce Bir İl Seçin</div><div class="vetrh-empty-text">Listenin daraltılması için yukarıdaki menüden bir il seçmeniz gerekir. Sonrasında ilçe ile filtreleyebilir veya isim/adres üzerinden arama yapabilirsiniz.</div></div>';
          countLine.textContent = 'İl seçerek listeyi görüntüleyin';
          clearBtn.style.display = 'none';
          return;
        }
        currentResults = VETS.filter(function(v){
          if (v.i !== citySel.value) return false;
          if (districtSel.value && (v.d || '') !== districtSel.value) return false;
          if (nq) {
            var hay = normalize((v.n || '') + ' ' + (v.u || '') + ' ' + (v.a || '') + ' ' + (v.m || ''));
            if (hay.indexOf(nq) === -1) return false;
          }
          return true;
        });
        clearBtn.style.display = '';
        var cityName = toTitleCase(citySel.value);
        var districtName = districtSel.value ? ' / ' + toTitleCase(districtSel.value) : '';
        var searchNote = q ? ' · "' + escapeHtml(q) + '" araması' : '';
        countLine.innerHTML = '<b>' + currentResults.length + '</b> kayıt — ' + escapeHtml(cityName + districtName) + searchNote;
        if (currentResults.length === 0) {
          resultsEl.innerHTML = '<div class="vetrh-empty"><div class="vetrh-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></div><div class="vetrh-empty-title">Sonuç Bulunamadı</div><div class="vetrh-empty-text">Seçtiğiniz kriterlere uyan bir muayenehane yok. İlçeyi kaldırmayı veya arama terimini değiştirmeyi deneyin.</div></div>';
          return;
        }
      }
      var slice = currentResults.slice(displayedCount, displayedCount + PAGE_SIZE);
      var frag = document.createDocumentFragment();
      for (var i = 0; i < slice.length; i++) frag.appendChild(buildCard(slice[i], q));
      var existing = document.getElementById('vetrh-loadmore-wrap');
      if (existing) existing.remove();
      resultsEl.appendChild(frag);
      displayedCount += slice.length;
      if (displayedCount < currentResults.length) {
        var wrap = document.createElement('div');
        wrap.className = 'vetrh-loadmore-wrap';
        wrap.id = 'vetrh-loadmore-wrap';
        var btn = document.createElement('button');
        btn.className = 'vetrh-loadmore';
        btn.textContent = 'Sonraki ' + Math.min(PAGE_SIZE, currentResults.length - displayedCount) + ' Kaydı Yükle (' + displayedCount + '/' + currentResults.length + ')';
        btn.onclick = function(){ render(false); };
        wrap.appendChild(btn);
        resultsEl.appendChild(wrap);
      }
    }

    for (var i = 0; i < VETS.length; i++) {
      var v = VETS[i];
      var c = v.i; if (!c) continue;
      if (!cityIndex[c]) cityIndex[c] = {};
      cityIndex[c][v.d || ''] = true;
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    }
    cities = Object.keys(cityIndex).sort(function(a, b){ return a.localeCompare(b, 'tr'); });
    var totalDistricts = 0;
    for (var k = 0; k < cities.length; k++) totalDistricts += Object.keys(cityIndex[cities[k]]).length;

    document.getElementById('vetrh-stat-total').textContent = VETS.length.toLocaleString('tr-TR');
    document.getElementById('vetrh-stat-cities').textContent = cities.length;
    document.getElementById('vetrh-stat-districts').textContent = totalDistricts;

    citySel.innerHTML = '<option value="">İl seçiniz…</option>';
    for (var j = 0; j < cities.length; j++) {
      var opt = document.createElement('option');
      opt.value = cities[j];
      opt.textContent = toTitleCase(cities[j]) + ' (' + cityCounts[cities[j]] + ')';
      citySel.appendChild(opt);
    }
    citySel.disabled = false;

    citySel.addEventListener('change', function(){
      districtSel.innerHTML = '<option value="">Tüm İlçeler</option>';
      if (citySel.value) {
        districtSel.disabled = false;
        var ds = Object.keys(cityIndex[citySel.value]).filter(Boolean).sort(function(a, b){ return a.localeCompare(b, 'tr'); });
        for (var i2 = 0; i2 < ds.length; i2++) {
          var o = document.createElement('option');
          o.value = ds[i2];
          o.textContent = toTitleCase(ds[i2]) + ' (' + countByCityDistrict(citySel.value, ds[i2]) + ')';
          districtSel.appendChild(o);
        }
      } else {
        districtSel.disabled = true;
        districtSel.innerHTML = '<option value="">Önce il seçin</option>';
      }
      render();
    });
    districtSel.addEventListener('change', function(){ render(); });
    var searchTimer;
    searchInput.addEventListener('input', function(){
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function(){ render(); }, 180);
    });
    clearBtn.addEventListener('click', function(){
      citySel.value = '';
      districtSel.innerHTML = '<option value="">Önce il seçin</option>';
      districtSel.disabled = true;
      searchInput.value = '';
      render();
    });

    render();
  }
})();
