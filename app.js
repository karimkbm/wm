/* Gedeelde logica voor de kinderdashboards: klok, weer, data uit JSON, aftellen.
   Licht gehouden voor een Galaxy Tab A (2016) in Firefox. */
(function(){
  var DAGEN = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
  var MND = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  var MK = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  var DATA = document.body.getAttribute("data-src");
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function iso(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
  function parse(s){ var p = s.split("-"); return new Date(+p[0], +p[1]-1, +p[2]); }
  function isoWeek(d){ var t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate()+3-((t.getDay()+6)%7)); var y = new Date(t.getFullYear(),0,4); return 1+Math.round(((t-y)/864e5-3+((y.getDay()+6)%7))/7); }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function dagLabel(s, tot){
    var vandaag = iso(new Date());
    if(tot && s < vandaag && tot >= vandaag) return "Nu bezig";
    var d = parse(s), n = Math.round((d - parse(vandaag))/864e5);
    if(n === 0) return "Vandaag"; if(n === 1) return "Morgen";
    return cap(DAGEN[d.getDay()].slice(0,2))+" "+d.getDate()+" "+MK[d.getMonth()];
  }
  function over(s){ var n = Math.round((parse(s) - parse(iso(new Date())))/864e5); return n; }

  function klok(){
    var d = new Date();
    $("tijd").textContent = pad(d.getHours())+":"+pad(d.getMinutes());
    $("datum").textContent = cap(DAGEN[d.getDay()])+" "+d.getDate()+" "+MND[d.getMonth()];
    $("week").textContent = "week "+isoWeek(d);
    if(d.getHours() === 4 && d.getMinutes() === 0) location.reload();
  }

  var WEER = {0:["helder","zon"],1:["vrijwel helder","zon"],2:["half bewolkt","wolk"],3:["bewolkt","wolk"],45:["mist","wolk"],48:["mist","wolk"],51:["motregen","regen"],53:["motregen","regen"],55:["motregen","regen"],61:["lichte regen","regen"],63:["regen","regen"],65:["flinke regen","regen"],71:["sneeuw","sneeuw"],73:["sneeuw","sneeuw"],75:["sneeuw","sneeuw"],80:["buien","regen"],81:["buien","regen"],82:["zware buien","regen"],95:["onweer","regen"],96:["onweer","regen"],99:["onweer","regen"]};
  var ICON = {
    zon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>',
    wolk:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 7 18z" fill="currentColor"/></svg>',
    regen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7.1 3.5 3.5 0 0 0 7 14z" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></g></svg>',
    sneeuw:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 7.1 3.5 3.5 0 0 0 7 14z" fill="currentColor"/><g fill="currentColor"><circle cx="8" cy="18.5" r="1.2"/><circle cx="12" cy="20" r="1.2"/><circle cx="16" cy="18.5" r="1.2"/></g></svg>'
  };
  function weer(){
    var x = new XMLHttpRequest();
    x.open("GET","https://api.open-meteo.com/v1/forecast?latitude=51.56&longitude=5.09&current=temperature_2m,weather_code&hourly=precipitation_probability&forecast_hours=3&timezone=Europe%2FAmsterdam");
    x.onload = function(){
      try{
        var r = JSON.parse(x.responseText), c = r.current, w = WEER[c.weather_code] || ["",""];
        var kans = Math.max.apply(null, (r.hourly && r.hourly.precipitation_probability) || [0]);
        $("weer").innerHTML = (ICON[w[1]]||"") + '<b>'+Math.round(c.temperature_2m)+'°</b><span>'+esc(w[0])+(kans >= 30 ? ' · '+kans+'% regen' : '')+'</span>';
      }catch(e){}
    };
    x.send();
  }

  var laatste = null;
  /* Haalt regels weg die niet in hun vak passen, zodat niets over elkaar heen valt. */
  function pas(){
    var panels = document.querySelectorAll(".panel");
    for(var p = 0; p < panels.length; p++){
      var ul = panels[p].querySelector("ul"); if(!ul) continue;
      var lis = ul.querySelectorAll("li");
      for(var k = lis.length - 1; k > 0 && panels[p].scrollHeight > panels[p].clientHeight + 1; k--) ul.removeChild(lis[k]);
    }
  }
  function render(d){
    laatste = d;
    if(d.quote && $("quote")){
      var q = typeof d.quote === "string" ? {tekst: d.quote} : d.quote;
      $("quote").textContent = q.tekst ? "\u201C" + q.tekst + "\u201D" : "";
      if($("wie")){ $("wie").textContent = q.wie ? "\u2014 " + q.wie : ""; $("wie").hidden = !q.wie; }
    }
    if(d.aftellen && $("aftel")){
      var n = over(d.aftellen.datum);
      if(n >= 0){ $("aftel").hidden = false; $("aftel-n").textContent = n === 0 ? "VANDAAG" : n; $("aftel-u").textContent = n === 0 ? "" : (n === 1 ? "dag" : "dagen"); $("aftel-t").textContent = d.aftellen.titel; }
      else $("aftel").hidden = true;
    }
    var vandaag = iso(new Date());
    (d.secties || []).forEach(function(s){
      var el = $(s.id); if(!el) return;
      var items = (s.items || []).filter(function(i){ return !i.datum || (i.tot || i.datum) >= vandaag; });
      items.sort(function(a,b){ return (a.datum||"0") < (b.datum||"0") ? -1 : 1; });
      var max = +el.getAttribute("data-max") || 4;
      el.innerHTML = items.slice(0, max).map(function(i){
        var soon = i.datum && over(i.datum) <= 7 && (i.tot || i.datum) >= vandaag;
        return '<li'+(soon ? ' class="soon"' : '')+'>'+(i.datum ? '<time>'+esc(dagLabel(i.datum, i.tot))+'</time>' : '')+'<div><b>'+esc(i.titel)+'</b>'+(i.sub ? '<small>'+esc(i.sub)+'</small>' : '')+'</div></li>';
      }).join("") || '<li class="leeg">Even niks nieuws.</li>';
    });
    if($("bijgewerkt") && d.bijgewerkt) $("bijgewerkt").textContent = "bijgewerkt "+d.bijgewerkt;
    pas();
    pasQuote();
  }
  /* Maakt de quote kleiner tot hij helemaal in zijn vak past. */
  function pasQuote(){
    var q = $("quote"); if(!q) return;
    var box = q.parentNode, wie = $("wie");
    q.style.fontSize = "";
    function teVol(){
      var laatst = (wie && !wie.hidden) ? wie : q;
      var onder = box.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(box).paddingBottom) || 0);
      return laatst.getBoundingClientRect().bottom > onder + 1;
    }
    var s = parseFloat(getComputedStyle(q).fontSize) || 24;
    for(var i = 0; i < 40 && teVol() && s > 13; i++){ s -= 1; q.style.fontSize = s + "px"; }
  }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ setTimeout(pasOpnieuw, 50); });
  var rt;
  function pasOpnieuw(){ if(laatste){ var d = laatste; laatste = null; render(d); } }
  window.addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(pasOpnieuw, 200); });

  /* Volledig scherm en scherm wakker houden: werkt na een tik (zo willen browsers het). */
  var fsKnop = $("fs");
  function isVol(){ return !!(document.fullscreenElement || document.webkitFullscreenElement) || (window.matchMedia && (matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches)); }
  function toonKnop(){ if(fsKnop) fsKnop.hidden = isVol(); }
  var lock = null;
  function wakker(){ try{ if(navigator.wakeLock && !lock) navigator.wakeLock.request("screen").then(function(l){ lock = l; l.addEventListener("release", function(){ lock = null; }); }).catch(function(){}); }catch(e){} }
  function volScherm(){
    var el = document.documentElement;
    try{
      if(!isVol()){
        var r = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
        if(r && r.catch) r.catch(function(){});
      }
    }catch(e){}
    wakker();
  }
  document.addEventListener("click", volScherm);
  document.addEventListener("fullscreenchange", function(){ toonKnop(); setTimeout(pasOpnieuw, 300); });
  document.addEventListener("webkitfullscreenchange", function(){ toonKnop(); setTimeout(pasOpnieuw, 300); });
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible" && isVol()) wakker(); });
  toonKnop();
  function laad(){
    var x = new XMLHttpRequest();
    x.open("GET", DATA+"?t="+Date.now());
    x.onload = function(){ try{ var d = JSON.parse(x.responseText); localStore(d); render(d); }catch(e){} };
    x.onerror = function(){ var d = localLoad(); if(d) render(d); };
    x.send();
  }
  function localStore(d){ try{ localStorage.setItem(DATA, JSON.stringify(d)); }catch(e){} }
  function localLoad(){ try{ return JSON.parse(localStorage.getItem(DATA)); }catch(e){ return null; } }

  var c = localLoad(); if(c) render(c);
  klok(); setInterval(klok, 15000);
  weer(); setInterval(weer, 30*60000);
  laad(); setInterval(laad, 30*60000);
})();
