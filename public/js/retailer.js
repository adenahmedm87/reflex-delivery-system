const token=localStorage.getItem('reflex_token'),user=JSON.parse(localStorage.getItem('reflex_user')||'null');
if(!token||user?.role!=='RETAILER')location.href='/';logout.onclick=()=>{localStorage.clear();location.href='/';};
const msg=document.getElementById('msg');async function api(p,o={}){const h={...(o.headers||{}),Authorization:`Bearer ${token}`};
if(o.body)h['Content-Type']='application/json';
const r=await fetch(p,{...o,headers:h}),d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;}const map=L.map('map').setView([-1.286389,36.817223],12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
let lat=null,lng=null,marker=null;map.on('click',e=>{lat=e.latlng.lat;lng=e.latlng.lng;pin.textContent=`Destination: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
if(marker)marker.setLatLng(e.latlng);else marker=L.marker(e.latlng).addTo(map);});
function card(o){return `<article class="card order"><div class="orderhead"><div><div class="orderno">${o.orderNumber}</div>
<span class="status">${o.status}</span> <span class="status health-${o.healthStatus}">${o.healthStatus}</span></div>
<button class="btn secondary" data-qr="${o.orderNumber}">Show QR</button></div>
<div class="meta"><div><strong>Customer</strong>${o.customerName}</div>
<div><strong>Rider</strong>${o.riderName||'Not assigned'}</div>
<div><strong>ETA</strong>${o.etaMinutes?o.etaMinutes+' min':'-'}</div>
<div><strong>Reason</strong>${o.healthReason}</div><div><strong>Exception</strong>${o.activeException||'None'}</div>
<div><strong>Resolution</strong>${o.resolutionStatus||'None'}</div></div>
<div id="qr-${o.orderNumber}" class="hidden"></div></article>`;}async function load()
{try{const list=await api('/api/orders');orders.innerHTML=list.map(card).join('')||'<div class="card">No orders yet.</div>';document.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>{const 
box=document.getElementById('qr-'+b.dataset.qr);box.classList.toggle('hidden');
if(!box.dataset.done){new QRCode(box,{text:b.dataset.qr,width:140,height:140});box.dataset.done='1';}});}catch(e)
{msg.innerHTML=`<div class="notice error">${e.message}</div>`;}}orderForm.onsubmit=async e=>{e.preventDefault();
if(lat===null)return msg.innerHTML='<div class="notice warning">Click the destination map first.</div>';try{const o=await api('/api/orders',
{method:'POST',body:JSON.stringify({customerName:customerName.value,customerPhone:customerPhone.value,address:address.value,itemDescription:item.value,priority:priority.value,destinationLat:lat,
destinationLng:lng})});msg.innerHTML=`<div class="notice ok">Created ${o.orderNumber}</div>`;orderForm.reset();await load();}catch(e){msg.innerHTML=`<div class="notice 
error">${e.message}</div>`;}};io().on('order:updated',load);load();