const coverFrame='.work-visual__shape';
export const coverProgress=.44;

function previewFrames(card, fill, detail, transform) {
  const keys=Object.keys(card);
  const velocity=Object.fromEntries(keys.map(key=>{
    const before=(fill[key]-card[key])/coverProgress;
    const after=(detail[key]-fill[key])/(1-coverProgress);
    return [key,before*after>0?2*before*after/(before+after):0];
  }));
  const steps=12;
  // Both halves share the same velocity at the full-cover pose.
  return Array.from({length:steps*2+1},(_,i)=>{
    const first=i<=steps;
    const t=(first?i:i-steps)/steps;
    const start=first?card:fill, end=first?fill:detail;
    const span=first?coverProgress:1-coverProgress;
    const blend=t*t*(3-2*t);
    const tangent=first?t*t*(t-1):t*(1-t)*(1-t);
    const pose=Object.fromEntries(keys.map(key=>[
      key,start[key]+(end[key]-start[key])*blend+velocity[key]*span*tangent
    ]));
    return {transform:transform(pose),offset:(first?0:coverProgress)+span*t};
  });
}

function imagePose(image, frame) {
  const rect=image.getBoundingClientRect();
  const transform=frame&&getComputedStyle(frame).transform;
  const matrix=new DOMMatrixReadOnly(transform&&transform!=='none'?transform:undefined);
  const scale=Math.hypot(matrix.a,matrix.b);
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,
    width:frame?image.offsetWidth*scale:rect.width,height:frame?image.offsetHeight*scale:rect.height,
    rotation:Math.atan2(matrix.b,matrix.a)};
}

function captureCover(element) {
  const rect=element.getBoundingClientRect();
  const decoration=element.cloneNode(true);
  decoration.querySelector(coverFrame).remove();
  decoration.classList.add('logic-preview-decoration');
  return {rect,decoration};
}

export function captureLogicPreview(source, entering) {
  const frame=entering?source.querySelector(coverFrame):null;
  const image=source.querySelector('img');
  if (!image?.complete||!image.naturalWidth||typeof image.animate!=='function'||(entering&&!frame)) return;
  const pose=imagePose(image,frame);
  if (!pose.width||!pose.height) return;
  const preview=document.createElement('img');
  preview.src=image.currentSrc||image.src;
  preview.alt='';
  preview.className='logic-preview-picture';
  return {entering,preview,pose,cover:entering?captureCover(source):null};
}

export function playLogicPreview(capture, target, viewport) {
  const {entering,preview,pose}=capture;
  const frame=entering?null:target.querySelector(coverFrame);
  const image=target.querySelector('img');
  if (!image||(!entering&&!frame)) return;
  const end=imagePose(image,frame);
  if (!end.width||!end.height) return;
  const {rect,decoration}=capture.cover??captureCover(target);
  const card=entering?pose:end, detail=entering?end:pose;
  const fillScale=Math.max(rect.width/detail.width,rect.height/detail.height);
  const fill={x:rect.left+rect.width/2,y:rect.top+rect.height/2,
    width:detail.width*fillScale,height:detail.height*fillScale,rotation:0};
  const bounds=viewport.getBoundingClientRect();
  const overlay=document.createElement('div');
  overlay.className='logic-preview-transition';
  overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});
  Object.assign(decoration.style,{left:rect.left-bounds.left+'px',top:rect.top-bounds.top+'px',width:rect.width+'px',height:rect.height+'px'});
  Object.assign(preview.style,{width:detail.width+'px',height:detail.height+'px'});
  const transform=({x,y,width,height,rotation})=>
    `translate3d(${x-bounds.left-detail.width/2}px,${y-bounds.top-detail.height/2}px,0) rotate(${rotation}rad) scale(${width/detail.width},${height/detail.height})`;
  const timing={duration:entering?720:620,direction:entering?'normal':'reverse',fill:'both'};
  const previousTransform=frame?.style.transform;
  if (frame) frame.style.transform=getComputedStyle(frame).transform;
  const animations=[];
  const cleanup=()=>{
    if (frame) frame.style.transform=previousTransform;
    target.classList.remove('work-visual--hidden');
    overlay.remove();
    for (const animation of animations) animation.cancel();
  };
  overlay.append(decoration,preview);
  document.body.append(overlay);
  target.classList.add('work-visual--hidden');
  try {
    animations.push(preview.animate(previewFrames(card,fill,detail,transform),timing));
    animations.push(decoration.animate([
      {opacity:1,offset:0},{opacity:1,offset:coverProgress,easing:'ease-in-out'},
      {opacity:0,offset:.72},{opacity:0,offset:1}
    ],timing));
    const copy=entering&&target.previousElementSibling;
    if (copy) animations.push(copy.animate([
      {opacity:.2,offset:0},{opacity:.2,offset:.2,easing:'ease-in-out'},
      {opacity:1,offset:.82},{opacity:1,offset:1}
    ],timing));
    return {animation:animations[0],target,to:target.getBoundingClientRect(),cleanup};
  } catch {
    cleanup();
  }
}
