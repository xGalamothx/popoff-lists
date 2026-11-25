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

  // Remember a visitor's explicit language choice.
  const preferenceKey="popoff-site-language";
  document.querySelectorAll("[data-language-choice]").forEach(link=>{
    link.addEventListener("click",()=>{
      try{localStorage.setItem(preferenceKey,link.dataset.languageChoice);}catch(_){}
    });
  });

  // On the first visit, use the browser's preferred language (English or Spanish).
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
    const file=path.split("/").pop()||"index.html";
    let target=path;
    if(preferred==="en"&&!isEnglish){
      target=path.replace(/\/(index\.html|docs\.html|privacy\.html|contribute\.html)$/,"/en/$1");
    }else if(preferred==="es"&&isEnglish){
      target=path.replace(/\/en(?=\/|$)/,"");
    }
    if(target!==path)window.location.replace(target);
  }
});