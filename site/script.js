document.addEventListener("DOMContentLoaded",()=>{
  const toggle=document.querySelector(".menu-toggle");
  const nav=document.querySelector(".nav-links");
  if(toggle&&nav){
    toggle.addEventListener("click",()=>{
      const open=nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded",String(open));
      toggle.textContent=open?"×":"☰";
    });
  }
  document.querySelectorAll("[data-year]").forEach(el=>{
    el.textContent=String(new Date().getFullYear());
  });

  const preferenceKey="popoff-site-language";
  document.querySelectorAll("[data-language-choice]").forEach(link=>{
    link.addEventListener("click",()=>{
      try{localStorage.setItem(preferenceKey,link.dataset.languageChoice);}catch(_){}
    });
  });

  // First visit: follow the browser's preferred language. Spanish is the fallback.
  let preferred="";
  try{preferred=localStorage.getItem(preferenceKey)||"";}catch(_){}
  if(!preferred){
    const languages=Array.isArray(navigator.languages)&&navigator.languages.length
      ?navigator.languages:[navigator.language||"es"];
    preferred=languages.some(language=>/^en(?:-|$)/i.test(language))?"en":"es";
  }

  const path=window.location.pathname;
  const isEnglish=/\/en(?:\/|$)/.test(path);
  const currentLanguage=isEnglish?"en":"es";
  if(preferred!==currentLanguage){
    let target=path;
    if(preferred==="en"&&!isEnglish){
      if(path.endsWith("/")) target=path+"en/";
      else target=path.replace(/\/(index\.html|docs\.html|privacy\.html|contribute\.html)$/,"/en/$1");
    }else if(preferred==="es"&&isEnglish){
      target=path.replace(/\/en(?=\/|$)/,"");
    }
    if(target!==path)window.location.replace(target);
  }
});