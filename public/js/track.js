let currentOrder='',currentPhone='',map,riderMarker,destMarker;

async function api(p,o={}){
  const h={...(o.headers||{})};
  if(o.body)h['Content-Type']='application/json';
  const r=await fetch(p,{...o,headers:h}),d=await r.json();
  if(!r.ok)throw new Error(d.error||'Request failed');
  return d;
}

function render(data){
  panel.classList.remove('hidden');
  const o=data.order;
  summary.innerHTML=`<div class="orderno">${o.orderNumber}</div><p><span class="status">${o.status}</span> <span class="status health-${o.healthStatus}">${o.healthStatus}</span></p><div class="meta"><div><strong>Customer</strong>${o.customerName}</div><div><strong>Rider</strong>${o.riderName||'Not assigned'}</div><div><strong>ETA</strong>${o.etaMinutes?o.etaMinutes+' min':'Not available yet'}</div><div><strong>Health</strong>${o.healthReason}</div><div><strong>Exception</strong>${o.activeException||'None'}</div><div><strong>Resolution</strong>${o.resolutionStatus||'None'}</div></div>`;
  actions.innerHTML='';
  if(['PICKED_UP','IN_TRANSIT'].includes(o.status))actions.innerHTML+=`<button class="btn" id="otp">Get delivery OTP</button>`;
  if(['PRODUCT_DAMAGED','PRODUCT_SPOILT'].includes(o.activeException)&&o.resolutionStatus==='PENDING_CUSTOMER_DECISION')actions.innerHTML+=`<div class="actions"><button class="btn success" id="reorder">Reorder</button><button class="btn danger" id="refund">Request refund</button></div>`;
  document.getElementById('otp')?.addEventListener('click',async()=>{try{const x=await api(`/api/orders/track/${currentOrder}/request-otp`,{method:'POST',body:JSON.stringify({phone:currentPhone})});msg.innerHTML=`<div class="notice warning">Demo OTP: <strong>${x.demoOtp}</strong>. Production version would send SMS.</div>`;}catch(e){msg.innerHTML=`<div class="notice error">${e.message}</div>`;}});
  document.getElementById('reorder')?.addEventListener('click',async()=>{const x=await api(`/api/orders/track/${currentOrder}/reorder`,{method:'POST',body:JSON.stringify({phone:currentPhone})});msg.innerHTML=`<div class="notice ok">Replacement order: ${x.newOrderNumber}</div>`;load();});
  document.getElementById('refund')?.addEventListener('click',async()=>{await api(`/api/orders/track/${currentOrder}/refund`,{method:'POST',body:JSON.stringify({phone:currentPhone})});msg.innerHTML='<div class="notice ok">Refund request recorded.</div>';load();});
  timeline.innerHTML=data.timeline.map(e=>`<li><strong>${e.type.replaceAll('_',' ')}</strong><br><span class="small muted">${new Date(e.server_timestamp).toLocaleString()}</span>${e.notes?`<br>${e.notes}`:''}</li>`).join('');
  if(!map){map=L.map('map').setView([-1.286389,36.817223],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);}
  if(riderMarker){map.removeLayer(riderMarker);riderMarker=null;}
  if(destMarker){map.removeLayer(destMarker);destMarker=null;}
  const pts=[];
  if(Number.isFinite(Number(o.lastLat))){const p=[Number(o.lastLat),Number(o.lastLng)];riderMarker=L.marker(p).addTo(map).bindPopup('Rider');pts.push(p);}
  if(Number.isFinite(Number(o.destinationLat))){const p=[Number(o.destinationLat),Number(o.destinationLng)];destMarker=L.marker(p).addTo(map).bindPopup('Destination');pts.push(p);}
  if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(.3));
  mapText.textContent=o.lastLocationAt?`Last update: ${new Date(o.lastLocationAt).toLocaleString()}`:'GPS will appear after pickup.';
  setTimeout(()=>map.invalidateSize(),50);
}

async function load(){
  try{
    const d=await api(`/api/orders/track/${encodeURIComponent(currentOrder)}?phone=${encodeURIComponent(currentPhone)}`);
    render(d);
    msg.innerHTML='<div class="notice ok">Tracking loaded.</div>';
  }catch(e){
    msg.innerHTML=`<div class="notice error">${e.message}</div>`;
    panel.classList.add('hidden');
  }
}

form.onsubmit=e=>{e.preventDefault();currentOrder=orderNumber.value.trim();currentPhone=phone.value.trim();load();};
io().on('order:updated',e=>{if(e.orderNumber===currentOrder)load();});
