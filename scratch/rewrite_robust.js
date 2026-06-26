const fs = require('fs');
const targetPath = 'd:\\Sonu\\WORKSHOPS\\Animate it\\ai_engineer_roadmap.html';
let html = fs.readFileSync(targetPath, 'utf8');

function replaceRobust(oldStr, newStr) {
  const safeRegex = oldStr.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&').replace(/\\s+/g, '\\s+');
  html = html.replace(new RegExp(safeRegex, 'g'), newStr);
}

const oldS0 = \`async function runS0() {
  setAccent(0); showScene('sc0');
  await sleep(200);
  add('s0-bg-grid','in');
  await sleep(400);
  add('s0-chip','in');
  await sleep(400);
  const words = qa('#s0-title .s0w');
  for(let i=0;i<words.length;i++){await sleep(i===0?0:160);words[i].classList.add('in');}
  await sleep(300); add('s0-rule','in');
  await sleep(350); add('s0-sub','in');
  await sleep(400);
  ['b0','b1','b2'].forEach((id,i)=>setTimeout(()=>add(id,'in'),i*160));
  await sleep(2400); hideScene('sc0');
}\`;
const newS0 = \`async function runS0() {
  setAccent(0); showScene('sc0');
  await sleep(200);
  animate(1400, p => q('s0-bg-grid').style.opacity = p);
  await sleep(400);
  animate(600, p => {
    const ep = easeOutExpo(p);
    q('s0-chip').style.opacity = ep;
    q('s0-chip').style.transform = \\\`translateY(\\\${(1-ep)*10}px)\\\`;
  });
  await sleep(400);
  const words = qa('#s0-title .s0w');
  for(let i=0;i<words.length;i++){
    await sleep(i===0?0:160);
    const w = words[i];
    animate(600, p => {
      const ep = easeOutBack(p);
      w.style.opacity = p;
      w.style.transform = \\\`translateY(\\\${(1-ep)*56}px) skewY(\\\${(1-ep)*3}deg)\\\`;
    });
  }
  await sleep(300); 
  animate(1300, p => q('s0-rule').style.width = \\\`\\\${easeOutBack(p)*180}px\\\`);
  await sleep(350); 
  animate(800, p => {
    q('s0-sub').style.opacity = p;
    q('s0-sub').style.transform = \\\`translateY(\\\${(1-p)*8}px)\\\`;
  });
  await sleep(400);
  ['b0','b1','b2'].forEach((id,i)=>setTimeout(()=>{
    animate(550, p => {
      const ep = easeOutBack(p);
      q(id).style.opacity = p;
      q(id).style.transform = \\\`scale(\\\${0.88 + ep*0.12})\\\`;
    });
  }, i*160));
  await sleep(2400); hideScene('sc0');
}\`;
replaceRobust(oldS0, newS0);

const oldS1 = \`async function runS1() {
  setAccent(1); await sleep(400); showScene('sc1');
  await sleep(300); add('s1-ey','in');
  await sleep(500);
  for(let i=0;i<5;i++){
    await sleep(i===0?0:190);
    add('sr'+i,'in');
    setTimeout(()=>{ q('sf'+i).style.width=SF_WIDTHS[i]+'%'; },300);
  }
  await sleep(3000); hideScene('sc1');
}\`;
const newS1 = \`async function runS1() {
  setAccent(1); await sleep(400); showScene('sc1');
  await sleep(300); 
  animate(700, p => q('s1-ey').style.opacity = p);
  await sleep(500);
  for(let i=0;i<5;i++){
    await sleep(i===0?0:190);
    animate(550, p => {
      const ep = easeOutBack(p);
      q('sr'+i).style.opacity = p;
      q('sr'+i).style.transform = \\\`translateX(\\\${(1-ep)*-22}px)\\\`;
      const tags = q('sr'+i).querySelectorAll('.skill-tag');
      tags.forEach(t => t.style.opacity = p);
    });
    setTimeout(()=>{ 
      animate(1100, p => q('sf'+i).style.width = \\\`\\\${SF_WIDTHS[i]*easeOutBack(p)}%\\\`);
    }, 300);
  }
  await sleep(3000); hideScene('sc1');
}\`;
replaceRobust(oldS1, newS1);

const oldS2 = \`async function runS2() {
  setAccent(2); await sleep(400); showScene('sc2');
  await sleep(300); add('s2-ey','in');
  await sleep(400);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:160);
    add('mc'+i,'in');
    const ii=i;
    setTimeout(()=>{
      q('mc'+ii).classList.add('glow');
      setTimeout(()=>q('mc'+ii).classList.remove('glow'),900);
    },350);
  }
  await sleep(2800); hideScene('sc2');
}\`;
const newS2 = \`async function runS2() {
  setAccent(2); await sleep(400); showScene('sc2');
  await sleep(300); 
  animate(700, p => q('s2-ey').style.opacity = p);
  await sleep(400);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:160);
    const mc = q('mc'+i);
    animate(500, p => {
      const ep = easeOutBack(p);
      mc.style.opacity = p;
      mc.style.transform = \\\`scale(\\\${0.86 + ep*0.14}) translateY(\\\${(1-ep)*12}px)\\\`;
      const desc = mc.querySelector('.mc-desc');
      if(desc) { desc.style.opacity = p; desc.style.transform = \\\`translateY(\\\${(1-p)*4}px)\\\`; }
    });
    setTimeout(()=>{
      mc.style.borderColor = 'var(--accent)';
      mc.style.background = 'color-mix(in srgb,var(--accent) 8%,var(--s0))';
      setTimeout(()=>{ mc.style.borderColor = ''; mc.style.background = ''; },900);
    },350);
  }
  await sleep(2800); hideScene('sc2');
}\`;
replaceRobust(oldS2, newS2);

const oldS3 = \`async function runS3() {
  setAccent(3); await sleep(400); showScene('sc3');
  await sleep(300); add('s3-ey','in');
  await sleep(500);
  for(let i=0;i<5;i++){
    await sleep(i===0?0:500);
    add('tc'+i,'in');
    q('tc'+i).classList.add('lit');
    if(i<4){
      await sleep(100);
      q('tf'+i).style.width='100%';
    }
  }
  await sleep(2200); hideScene('sc3');
}\`;
const newS3 = \`async function runS3() {
  setAccent(3); await sleep(400); showScene('sc3');
  await sleep(300); 
  animate(700, p => q('s3-ey').style.opacity = p);
  await sleep(500);
  for(let i=0;i<5;i++){
    await sleep(i===0?0:500);
    const tc = q('tc'+i);
    animate(600, p => {
      const ep = easeOutBack(p);
      tc.style.opacity = p;
      tc.style.transform = \\\`translateY(\\\${(1-ep)*20}px)\\\`;
      const sub = tc.querySelector('.tl-sub');
      if(sub) sub.style.opacity = p;
    });
    const dot = tc.querySelector('.tl-dot');
    setTimeout(() => {
      dot.style.borderColor = 'var(--accent)';
      dot.style.background = 'color-mix(in srgb,var(--accent) 15%,transparent)';
      animate(400, p => dot.style.transform = \\\`scale(\\\${1 + easeOutBack(p)*0.15})\\\`);
    }, 200);
    if(i<4){
      await sleep(100);
      animate(900, p => q('tf'+i).style.width = \\\`\\\${easeOutBack(p)*100}%\\\`);
    }
  }
  await sleep(2200); hideScene('sc3');
}\`;
replaceRobust(oldS3, newS3);

const oldS4 = \`async function runS4() {
  setAccent(4); await sleep(400); showScene('sc4');
  await sleep(300); add('s4-ey','in');
  await sleep(300);
  const allNodes = buildNeuralNet();

  // nodes appear layer by layer
  for(let li=0;li<allNodes.length;li++){
    await sleep(li===0?0:280);
    for(let ni=0;ni<allNodes[li].length;ni++){
      setTimeout(()=>{
        const el = q(\\\`nn_\\\${li}_\\\${ni}\\\`);
        el.classList.add('in');
        setTimeout(()=>{
          el.classList.add('lit');
          // light up connecting edges
          if(li>0){
            allNodes[li-1].forEach(prev=>{
              const line = q(\\\`nl_\\\${prev.li}_\\\${prev.ni}_\\\${ni}\\\`);
              if(line) line.classList.add('lit');
            });
          }
          setTimeout(()=>el.classList.remove('lit'),600);
        },200);
      }, ni*80);
    }
  }

  await sleep(1200);
  // pills
  for(let i=0;i<8;i++){
    await sleep(i===0?0:110);
    add('dp'+i,'in');
    setTimeout(()=>{
      q('dp'+i).classList.add('lit');
      setTimeout(()=>q('dp'+i).classList.remove('lit'),600);
    },200);
  }
  await sleep(2400); hideScene('sc4');
}\`;
const newS4 = \`async function runS4() {
  setAccent(4); await sleep(400); showScene('sc4');
  await sleep(300); 
  animate(700, p => q('s4-ey').style.opacity = p);
  await sleep(300);
  const allNodes = buildNeuralNet();

  for(let li=0;li<allNodes.length;li++){
    await sleep(li===0?0:280);
    for(let ni=0;ni<allNodes[li].length;ni++){
      setTimeout(()=>{
        const el = q(\\\`nn_\\\${li}_\\\${ni}\\\`);
        animate(450, p => {
          const ep = easeOutBack(p);
          el.style.opacity = p;
          el.style.transform = \\\`scale(\\\${ep})\\\`;
        });
        setTimeout(()=>{
          el.style.borderColor = 'var(--accent)';
          el.style.background = 'color-mix(in srgb,var(--accent) 20%,var(--s0))';
          el.style.boxShadow = '0 0 12px color-mix(in srgb,var(--accent) 40%,transparent)';
          if(li>0){
            allNodes[li-1].forEach(prev=>{
              const line = q(\\\`nl_\\\${prev.li}_\\\${prev.ni}_\\\${ni}\\\`);
              if(line) {
                line.style.stroke = 'color-mix(in srgb,var(--accent) 50%,transparent)';
                line.style.strokeWidth = '1.2';
              }
            });
          }
          setTimeout(()=>{
            el.style.borderColor = '';
            el.style.background = 'var(--s0)';
            el.style.boxShadow = '';
          },600);
        },200);
      }, ni*80);
    }
  }
  await sleep(1200);
  for(let i=0;i<8;i++){
    await sleep(i===0?0:110);
    const dp = q('dp'+i);
    animate(500, p => {
      const ep = easeOutBack(p);
      dp.style.opacity = p;
      dp.style.transform = \\\`translateY(\\\${(1-ep)*8}px) scale(\\\${0.94 + ep*0.06})\\\`;
    });
    setTimeout(()=>{
      dp.style.borderColor = 'var(--accent)';
      dp.style.color = 'var(--accent)';
      setTimeout(()=>{ dp.style.borderColor = ''; dp.style.color = ''; },600);
    },200);
  }
  await sleep(2400); hideScene('sc4');
}\`;
replaceRobust(oldS4, newS4);

const oldS5 = \`async function runS5() {
  setAccent(5); await sleep(400); showScene('sc5');
  buildPipeline();
  await sleep(300); add('s5-ey','in');
  await sleep(400);

  // ring progress animates
  setTimeout(()=>{
    const ring = q('s5-prog-ring');
    const circ = 2*Math.PI*120;
    ring.style.strokeDashoffset = circ*0.08;
  }, 300);

  // pipeline nodes appear
  for(let i=0;i<6;i++){
    await sleep(i===0?0:300);
    const g = q(\\\`pstep_\\\${i}\\\`);
    g.style.opacity='1'; g.style.transform='scale(1)';
  }

  await sleep(500);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:200);
    add('oi'+i,'in');
  }
  await sleep(2200); hideScene('sc5');
}\`;
const newS5 = \`async function runS5() {
  setAccent(5); await sleep(400); showScene('sc5');
  buildPipeline();
  await sleep(300); 
  animate(700, p => q('s5-ey').style.opacity = p);
  await sleep(400);

  setTimeout(()=>{
    const ring = q('s5-prog-ring');
    const circ = 2*Math.PI*120;
    const targetOffset = circ*0.08;
    animate(3000, p => ring.style.strokeDashoffset = circ - ((circ - targetOffset) * easeOutExpo(p)));
  }, 300);

  for(let i=0;i<6;i++){
    await sleep(i===0?0:300);
    const g = q(\\\`pstep_\\\${i}\\\`);
    animate(500, p => {
      const ep = easeOutBack(p);
      g.style.opacity = p;
      g.style.transform = \\\`scale(\\\${0.6 + ep*0.4})\\\`;
    });
  }

  await sleep(500);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:200);
    const oi = q('oi'+i);
    animate(500, p => {
      const ep = easeOutBack(p);
      oi.style.opacity = p;
      oi.style.transform = \\\`translateX(\\\${(1-ep)*16}px)\\\`;
      const dot = oi.querySelector('.ops-dot');
      if(dot) dot.style.transform = \\\`scale(\\\${1 + ep*0.4})\\\`;
    });
  }
  await sleep(2200); hideScene('sc5');
}\`;
replaceRobust(oldS5, newS5);

const oldS6 = \`async function runS6() {
  setAccent(6); await sleep(400); showScene('sc6');
  await sleep(300); add('s6-ey','in');
  await sleep(400);
  add('s6t0','in'); add('s6t1','in');
  await sleep(300);
  for(let i=0;i<8;i++){
    await sleep(i===0?0:200);
    add('li'+i,'in');
  }
  await sleep(2800); hideScene('sc6');
}\`;
const newS6 = \`async function runS6() {
  setAccent(6); await sleep(400); showScene('sc6');
  await sleep(300); 
  animate(700, p => q('s6-ey').style.opacity = p);
  await sleep(400);
  animate(700, p => { q('s6t0').style.opacity = p; q('s6t1').style.opacity = p; });
  await sleep(300);
  for(let i=0;i<8;i++){
    await sleep(i===0?0:200);
    const li = q('li'+i);
    animate(500, p => {
      const ep = easeOutBack(p);
      li.style.opacity = p;
      li.style.transform = \\\`translateY(\\\${(1-ep)*10}px)\\\`;
    });
  }
  await sleep(2800); hideScene('sc6');
}\`;
replaceRobust(oldS6, newS6);

const oldS7 = \`async function runS7() {
  setAccent(7); await sleep(400); showScene('sc7');
  add('s7-glow','in');
  await sleep(300); add('s7-pre','in');
  await sleep(500); add('s7-title','in');
  await sleep(600);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:140);
    add('sp'+i,'in');
    setTimeout(()=>{
      q('sp'+i).classList.add('lit');
      setTimeout(()=>q('sp'+i).classList.remove('lit'),600);
    },250+i*80);
  }
  await sleep(700); add('s7-rule','in');
  await sleep(400); add('s7-sub','in');
  await sleep(1400); add('replay-btn','in');
}\`;
const newS7 = \`async function runS7() {
  setAccent(7); await sleep(400); showScene('sc7');
  animate(2000, p => q('s7-glow').style.opacity = p);
  await sleep(300); 
  animate(700, p => { q('s7-pre').style.opacity = p; q('s7-pre').style.transform = \\\`translateY(\\\${(1-p)*8}px)\\\`; });
  await sleep(500); 
  animate(1000, p => {
    const ep = easeOutBack(p);
    q('s7-title').style.opacity = p;
    q('s7-title').style.transform = \\\`scale(\\\${0.9 + ep*0.1})\\\`;
  });
  await sleep(600);
  for(let i=0;i<6;i++){
    await sleep(i===0?0:140);
    const sp = q('sp'+i);
    animate(500, p => {
      const ep = easeOutBack(p);
      sp.style.opacity = p;
      sp.style.transform = \\\`translateY(\\\${(1-ep)*8}px) scale(\\\${0.94 + ep*0.06})\\\`;
    });
    setTimeout(()=>{
      sp.style.borderColor = 'var(--teal)';
      sp.style.color = 'var(--teal)';
      setTimeout(()=>{ sp.style.borderColor = ''; sp.style.color = ''; },600);
    },250+i*80);
  }
  await sleep(700); 
  animate(1500, p => q('s7-rule').style.width = \\\`\\\${easeOutBack(p)*220}px\\\`);
  await sleep(400); 
  animate(800, p => { q('s7-sub').style.opacity = p; q('s7-sub').style.transform = \\\`translateY(\\\${(1-p)*6}px)\\\`; });
  await sleep(1400); 
  animate(500, p => {
    const btn = q('replay-btn');
    btn.style.opacity = p;
    btn.style.pointerEvents = p === 1 ? 'auto' : 'none';
  });
}\`;
replaceRobust(oldS7, newS7);

html = html.replace(/add\('hud','in'\);/g, "animate(600, p => q('hud').style.opacity = p);");

fs.writeFileSync(targetPath, html);
console.log('All functions strictly replaced.');
