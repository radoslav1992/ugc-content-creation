import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, AudioLines, Captions, Image, Film, Play, Pause, Sparkles, Check, Plus, Mic2 } from 'lucide-react';
import { Wave } from './lib';
import { showcase } from './showcase-media';

function ShowcaseVideo({ src, poster, paused, label }: { src: string; poster: string; paused: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [paused, src]);
  return <video ref={ref} src={src} poster={poster} loop muted playsInline aria-label={label} />;
}

export function Landing() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % showcase.length), 4200);
    return () => clearInterval(timer);
  }, [paused]);
  return <main className="scene-landing">
    <section className="scene-hero container">
      <div className="scene-intro"><span className="scene-pill"><span /> YOUR NEXT GREAT IDEA, ON CAMERA</span>
        <h1>Big ideas.<br />Small crew.<br /><em>Just you.</em><span className="hero-asterisk" aria-hidden="true">✳</span></h1>
        <p>Meet your all-in-one AI content studio. Turn a script into expressive voices, talking avatars, and videos worth stopping for.</p>
        <div className="scene-actions"><Link className="btn dark" to="/register">Start creating free <ArrowUpRight size={19} /></Link><a className="scene-text-link" href="#how-it-works">Take a look around <ArrowRight size={17} /></a></div>
        <div className="scene-fine"><Check size={15} /> 1,000 welcome credits <span>·</span> No card required</div>
      </div>
      <div className="scene-stage" aria-label="AI-generated avatar showcase">
        <div className="stage-orbit" />
        <div className="scene-stage-label"><span className="live-dot" /> YOUR NEXT ON-SCREEN PERSONALITY</div>
        {showcase.map((person, i) => <div key={person.name} className={'creator-card card-' + ((i - active + showcase.length) % showcase.length)} aria-hidden={i !== active}>
          {person.video ? <ShowcaseVideo src={person.video} poster={person.poster} paused={paused || i !== active} label={person.alt} /> : <div role="img" aria-label={person.alt} className="creator-photo" style={{ backgroundImage: `url(${person.poster})`, backgroundPosition: person.position, backgroundSize: person.size || 'cover' }} />}
          <span className="creator-type"><Sparkles size={13} /> AI avatar concept</span>
          <div className="creator-caption"><span>{person.category}</span><strong>{person.headline}</strong><div className="creator-name"><span>{person.name} / {person.style}</span><span className="creator-play"><Play size={14} fill="currentColor" /></span></div></div>
        </div>)}
        <div className="scene-float voice-float"><span className="float-icon"><Mic2 size={20} /></span><div><strong>A voice with personality.</strong><Wave bars={26} small /></div></div>
        <div className="scene-float caption-float"><Captions size={18} /><strong>Make every word count.</strong><span>Captions, styled your way</span></div>
        <div className="showcase-controls">{showcase.map((p,i) => <button key={p.name} aria-label={'Show ' + p.name} aria-pressed={active===i} className={active===i?'active':''} onClick={()=>setActive(i)} />)}<button className="showcase-pause" onClick={()=>setPaused(!paused)} aria-label={paused?'Resume avatar rotation':'Pause avatar rotation'}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></div>
      </div>
    </section>
    <div className="scene-use-strip"><div className="container"><span>MADE FOR YOUR NEXT</span><strong>Product launch</strong><span>✳</span><strong>Scroll-stopping ad</strong><span>✳</span><strong>Big story</strong><span>✳</span><strong>Daily content</strong></div></div>
    <section className="container scene-section" id="tools"><div className="scene-section-heading"><div><span className="eyebrow">LESS TAB-HOPPING. MORE MAKING.</span><h2>A whole production crew.<br />In one little workspace.</h2></div><p>Write it. Voice it. Bring it to life.<br />Everything you need to go from an idea to a finished piece of content.</p></div>
      <div className="scene-tools-grid"><Link className="scene-tool tool-voice" to="/app/studio"><div className="tool-top"><AudioLines/><ArrowUpRight/></div><div className="voice-art"><span className="voice-bubble">Your words. A new dimension.</span><Wave bars={38}/><span className="mini-label">30 VOICES · PODCASTS · VOICEOVERS</span></div><h3>Sound like you mean it.</h3><p>Natural speech, two-host podcasts, and expressive voiceovers from your script.</p></Link>
      <Link className="scene-tool tool-video" to="/app/video-studio"><div className="tool-top"><Film/><ArrowUpRight/></div><div className="mini-avatar"><div style={{backgroundImage:`url(${showcase[1].poster})`,backgroundPosition:showcase[1].position,backgroundSize:showcase[1].size || 'cover'}}/><span><Play size={20} fill="currentColor"/></span></div><h3>Give your story a face.</h3><p>Turn a portrait and a voice into a talking avatar. Add emotion and make it yours.</p></Link>
      <Link className="scene-tool tool-media" to="/app/media"><div className="tool-top"><Image/><ArrowUpRight/></div><div className="media-art"><span className="media-tile">Aa<span>YOUR NEXT<br/>BIG THING.</span></span><span className="media-orb">✳</span><span className="media-tag"><Sparkles size={13}/> A little creative magic</span></div><h3>Make the finishing touches.</h3><p>Create product avatar visuals, style your captions, and export your next edit.</p></Link></div>
    </section>
    <section className="scene-process" id="how-it-works"><div className="container scene-process-grid"><div><span className="eyebrow">FROM WHAT IF TO THERE IT IS.</span><h2>Your idea.<br />Ready for its<br /><em>close-up.</em></h2><p>No camera setup. No recording booth. Just a story you want to tell.</p><Link className="btn primary" to="/register">Make your first creation <ArrowUpRight size={18}/></Link></div><div className="scene-steps">{[['01','Start with a few words.','Write your script, paste a draft, or build a conversation between two voices.'],['02','Find your on-screen energy.','Choose a voice. Upload a portrait. Shape the tone, delivery, and video quality.'],['03','Put your name on it.','Style the captions, preview the result, and download your content.']].map(([n,title,copy])=><div className="scene-step" key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></div></section>
    <section className="container scene-section scene-faq"><div><span className="eyebrow">A FEW GOOD QUESTIONS</span><h2>Curious?<br />Good.</h2><Link className="scene-text-link" to="/contact">Let's talk <ArrowUpRight size={18}/></Link></div><div>{[['What can I create with Scene?','Create text-to-speech audio, two-host podcasts, expressive voiceovers, talking avatar videos, product avatar images, and captioned edits. Your projects and generated media stay together in your workspace.'],['Can I use my own avatar or photos?','Yes. Upload a portrait you have permission to use. The portraits shown on this page are AI-generated visual concepts, not recordings of the video generator.'],['How do credits work?','Your plan provides one balance for creation. Standard audio uses one credit per character; premium speech and video have separate rates shown before generation. Check the pricing page for current allowances.'],['Can I try it for free?','Create an account and verify your email to receive 1,000 one-time welcome credits. No payment card is required.'],['Can I use my creations for client projects?','Yes, provided you have the rights to your scripts, portraits, and product images. Review each result before sharing it. See the terms for full details.']].map(([q,a])=><details key={q}><summary>{q}<Plus size={18}/></summary><p>{a}</p></details>)}</div></section>
    <section className="container scene-last"><div><span className="eyebrow">THE NEXT ONE IS YOURS.</span><h2>Less waiting.<br /><em>More creating.</em></h2></div><div><Link className="btn dark" to="/register">Let's make something <ArrowUpRight size={19}/></Link><p>Start with 1,000 free credits.</p></div><span aria-hidden="true">✳</span></section>
  </main>;
}
