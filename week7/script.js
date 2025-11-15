    (function(){
      const STORAGE_KEY = 'quotes_v1';
      const el = id=>document.getElementById(id);
      const form = el('quoteForm');
      const textInput = el('text');
      const authorInput = el('author');
      const tagsInput = el('tags');
      const addBtn = el('addBtn');
      const quotesWrap = el('quotes');
      const countEl = el('count');
      const searchInput = el('search');
      const sortSelect = el('sort');
      const exportBtn = el('exportBtn');
      const importFile = el('importFile');
      const clearAllBtn = el('clearAll');
      const shuffleBtn = el('shuffle');
      const favFilterBtn = el('favFilter');
      const clearSearchBtn = el('clearSearch');

      let quotes = [];
      let editingId = null;
      let showFavoritesOnly = false;

      function uid(){return Math.random().toString(36).slice(2,9)}

      function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));}
      function load(){
        try{
          const raw = localStorage.getItem(STORAGE_KEY);
          quotes = raw ? JSON.parse(raw) : [];
        }catch(e){quotes = []}
        if(!quotes.length){
          quotes = [
            {id:uid(), text:'The only true wisdom is in knowing you know nothing.', author:'Socrates', tags:['philosophy'], created:Date.now(), fav:false},
            {id:uid(), text:'Code is like humor. When you have to explain it, it’s bad.', author:'Cory House', tags:['code','humor'], created:Date.now()-1000*60*60*24, fav:false}
          ];
          save();
        }
      }

      function render(){
        const q = filteredAndSorted();
        quotesWrap.innerHTML = q.map(renderCard).join('') || '<div style="color:var(--muted);padding:14px">No quotes yet</div>';
        countEl.textContent = `${quotes.length} quote${quotes.length===1?'':'s'}`;
      }

      function filteredAndSorted(){
        const term = searchInput.value.trim().toLowerCase();
        let list = quotes.slice();
        if(showFavoritesOnly) list = list.filter(r=>r.fav);
        if(term){
          list = list.filter(r=> (r.text + ' ' + (r.author||'') + ' ' + (r.tags||[]).join(' ')).toLowerCase().includes(term));
        }
        const mode = sortSelect.value;
        if(mode==='newest') list.sort((a,b)=>b.created - a.created);
        else if(mode==='oldest') list.sort((a,b)=>a.created - b.created);
        else if(mode==='author') list.sort((a,b)=>((a.author||'').localeCompare(b.author||'')));
        return list;
      }

      function renderCard(q){
        const escaped = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const tags = (q.tags||[]).map(t=>`<span class="tag">${escaped(t)}</span>`).join(' ');
        return `
          <article class="quote-card" data-id="${q.id}">
            <div>
              <div class="quote-text">“${escaped(q.text)}”</div>
            </div>
            <div class="quote-meta">
              <div style="display:flex;flex-direction:column">
                <strong style="font-size:13px">${escaped(q.author||'—')}</strong>
                <div style="color:var(--muted);font-size:12px">${new Date(q.created).toLocaleString()}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end">
                <div class="actions">
                  <button data-action="fav" class="small">${q.fav? '★' : '☆'}</button>
                  <button data-action="edit" class="ghost small">Edit</button>
                  <button data-action="delete" class="ghost small">Delete</button>
                </div>
                <div style="margin-top:6px">${tags}</div>
              </div>
            </div>
          </article>
        `;
      }

      // events
      form.addEventListener('submit', e=>{
        e.preventDefault();
        const text = textInput.value.trim();
        if(!text) return;
        const author = authorInput.value.trim();
        const tags = tagsInput.value.split(',').map(s=>s.trim()).filter(Boolean);
        if(editingId){
          const idx = quotes.findIndex(q=>q.id===editingId);
          if(idx>=0){
            quotes[idx].text = text;
            quotes[idx].author = author;
            quotes[idx].tags = tags;
            quotes[idx].edited = Date.now();
          }
          editingId = null;
          addBtn.textContent = 'Save';
        } else {
          quotes.push({id:uid(), text, author, tags, created:Date.now(), fav:false});
        }
        save();
        form.reset();
        render();
      });

      quotesWrap.addEventListener('click', e=>{
        const btn = e.target.closest('button');
        if(!btn) return;
        const card = e.target.closest('.quote-card');
        if(!card) return;
        const id = card.dataset.id;
        const action = btn.dataset.action;
        if(action==='edit') loadToForm(id);
        else if(action==='delete') doDelete(id);
        else if(action==='fav') toggleFav(id);
      });

      function loadToForm(id){
        const q = quotes.find(x=>x.id===id); if(!q) return;
        textInput.value = q.text; authorInput.value = q.author||''; tagsInput.value = (q.tags||[]).join(', ');
        editingId = id; addBtn.textContent = 'Update';
        window.scrollTo({top:0,behavior:'smooth'});
      }

      function doDelete(id){
        if(!confirm('Delete this quote?')) return;
        quotes = quotes.filter(q=>q.id!==id);
        save(); render();
      }

      function toggleFav(id){
        const q = quotes.find(x=>x.id===id); if(!q) return;
        q.fav = !q.fav; save(); render();
      }

      searchInput.addEventListener('input', ()=>render());
      clearSearchBtn.addEventListener('click', ()=>{searchInput.value='';render();});
      sortSelect.addEventListener('change', ()=>render());

      exportBtn.addEventListener('click', ()=>{
        const data = JSON.stringify(quotes, null, 2);
        const blob = new Blob([data], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'quotes.json'; a.click(); URL.revokeObjectURL(url);
      });

      importFile.addEventListener('change', e=>{
        const f = e.target.files[0]; if(!f) return;
        const reader = new FileReader();
        reader.onload = ev=>{
          try{
            const parsed = JSON.parse(ev.target.result);
            if(Array.isArray(parsed)){
              // simple merge: keep existing, add imported with new ids if collisions
              parsed.forEach(item=>{
                const it = Object.assign({}, item);
                it.id = it.id && !quotes.some(q=>q.id===it.id) ? it.id : uid();
                it.created = it.created ? Number(it.created) : Date.now();
                it.tags = Array.isArray(it.tags)? it.tags : (String(it.tags||'').split(',').map(s=>s.trim()).filter(Boolean));
                it.fav = !!it.fav;
                quotes.push(it);
              });
              save(); render();
            } else alert('Invalid file format: expected an array of quote objects');
          }catch(ex){alert('Failed to import: ' + ex.message)}
        };
        reader.readAsText(f);
        e.target.value = '';
      });

      clearAllBtn.addEventListener('click', ()=>{
        if(!confirm('Clear all quotes? This cannot be undone.')) return;
        quotes = []; save(); render();
      });

      shuffleBtn.addEventListener('click', ()=>{
        if(!quotes.length) return;
        const r = quotes[Math.floor(Math.random()*quotes.length)];
        alert(`\u201C${r.text}\u201D\n— ${r.author||'Unknown'}`);
      });

      favFilterBtn.addEventListener('click', ()=>{
        showFavoritesOnly = !showFavoritesOnly; favFilterBtn.textContent = showFavoritesOnly? 'Showing Favorites' : 'Show Favorites'; render();
      });

      // initialize
      load(); render();
    })();