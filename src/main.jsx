import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const DEMO_USER = { userId: 'demo-user', email: 'demo@tattoo.test' }
const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const api = async (path, options) => {
  const res = await fetch(path, options && { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error || 'Request failed')
  return json
}

function useRoute() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])
  const nav = (to) => { history.pushState(null, '', to); setPath(location.pathname); scrollTo(0, 0) }
  return [path, nav]
}

function App() {
  const [path, nav] = useRoute()
  const route = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return { name: parts[0] || 'home', id: parts[1] }
  }, [path])
  return <>
    <header className="nav">
      <button onClick={() => nav('/')} className="brand"><span>🍷</span> TATTOO <span>Wine Marketplace</span></button>
      <nav>
        <button onClick={() => nav('/')}>Home</button>
        <button onClick={() => nav('/orders')}>My Orders</button>
        <button onClick={() => nav('/cellar')}>My Cellar</button>
        <button onClick={() => nav('/resale')}>Resale Market</button>
      </nav>
    </header>
    <main>
      <div className="user-pill">Mock login: {DEMO_USER.email}</div>
      {route.name === 'home' && <Home nav={nav} />}
      {route.name === 'product' && <Product id={route.id} nav={nav} />}
      {route.name === 'checkout' && <Checkout productId={route.id} nav={nav} />}
      {route.name === 'payment' && <Payment orderId={route.id} nav={nav} />}
      {route.name === 'orders' && <Orders />}
      {route.name === 'cellar' && <Cellar nav={nav} />}
      {route.name === 'resale' && <Resale />}
      {route.name === 'resell' && <Resell productId={route.id} nav={nav} />}
    </main>
  </>
}

function Home({ nav }) {
  const [products, setProducts] = useState([])
  useEffect(() => { api('/api/products').then(d => setProducts(d.products)).catch(alert) }, [])
  return <section><Hero /><div className="grid">{products.map(p => <article className="card" key={p.id} onClick={() => nav(`/product/${p.id}`)}>
    <img src={p.image_url} alt={p.name} /><div><p className="eyebrow">Limited allocation</p><h3>{p.name}</h3><p>{p.description}</p><div className="row"><b>{money(p.price_cents)}</b><span>{p.stock} in stock</span></div></div>
  </article>)}</div></section>
}
function Hero(){return <section className="hero"><div><p className="eyebrow">Black-gold wine / Web3 lifestyle testnet</p><h1>Luxury bottles, digital cellar, frictionless resale.</h1><p>Prototype commerce flow for TATTOO Lifestyle collectors—no real Stripe, Privy, or Web3 integrations.</p></div><span className="gem">◆</span></section>}
function Product({ id, nav }) {
  const [p, setP] = useState(null), [qty,setQty]=useState(1)
  useEffect(()=>{api(`/api/product?id=${id}`).then(d=>setP(d.product)).catch(alert)},[id])
  if(!p) return <p>Loading...</p>
  return <section className="detail"><img src={p.image_url} alt={p.name}/><div className="panel"><p className="eyebrow">Estate reserve</p><h1>{p.name}</h1><p>{p.description}</p><h2>{money(p.price_cents)}</h2><p>{p.stock} bottles available</p><label>Quantity<input type="number" min="1" max={p.stock} value={qty} onChange={e=>setQty(e.target.value)} /></label><button className="primary" onClick={()=>nav(`/checkout/${p.id}?qty=${qty}`)}><span>🛍</span> Buy Now</button></div></section>
}
function Checkout({ productId, nav }) {
  const qty = Number(new URLSearchParams(location.search).get('qty') || 1), [p,setP]=useState(null), [loading,setLoading]=useState(true), [notFound,setNotFound]=useState(false), [busy,setBusy]=useState(false)
  useEffect(()=>{setLoading(true); setNotFound(false); setP(null); api(`/api/product?id=${encodeURIComponent(productId)}`).then(d=>{setP(d.product); setNotFound(!d.product)}).catch(e=>{if(e.message === 'Product not found') setNotFound(true); else alert(e.message)}).finally(()=>setLoading(false))},[productId])
  const create=async()=>{setBusy(true); try{const d=await api('/api/orders/create',{method:'POST',body:JSON.stringify({userId:DEMO_USER.userId, productId, quantity:qty})}); nav(`/payment/${d.order.id}`)}catch(e){alert(e.message)}finally{setBusy(false)}}
  if(loading) return <section className="panel narrow"><h1>Checkout</h1><p>Loading product...</p></section>
  if(notFound || !p) return <section className="panel narrow"><h1>Product not found</h1><p>The selected product could not be found. Please return home and choose another bottle.</p><button className="primary" onClick={()=>nav('/')}>Back Home</button></section>
  return <section className="panel narrow"><h1>Checkout</h1><p>{p.name} × {qty}</p><h2>Total {money(p.price_cents*qty)}</h2><button className="primary" disabled={busy} onClick={create}>Proceed to Payment</button></section>
}
function Payment({ orderId, nav }) {
  const [busy,setBusy]=useState(false)
  const pay=async()=>{setBusy(true); try{await api('/api/orders/pay',{method:'POST',body:JSON.stringify({userId:DEMO_USER.userId, orderId})}); nav('/cellar')}catch(e){alert(e.message)}finally{setBusy(false)}}
  return <section className="panel narrow stripe"><h1>Stripe-style secure payment</h1><input placeholder="4242 4242 4242 4242"/><div className="row"><input placeholder="MM / YY"/><input placeholder="CVC"/></div><input placeholder="Cardholder name"/><button className="primary" disabled={busy} onClick={pay}>Pay Successfully</button></section>
}
function Orders(){const [orders,setOrders]=useState([]); useEffect(()=>{api(`/api/orders?userId=${DEMO_USER.userId}`).then(d=>setOrders(d.orders)).catch(alert)},[]); return <List title="My Orders" items={orders.map(o=>({title:`#${o.id} ${o.product_name}`, meta:`${o.quantity} · ${money(o.total_cents)} · ${new Date(o.created_at).toLocaleString()}`, badge:o.status}))}/>}
function Cellar({nav}){const [items,setItems]=useState([]); useEffect(()=>{api(`/api/cellar?userId=${DEMO_USER.userId}`).then(d=>setItems(d.items)).catch(alert)},[]); return <section><h1>My Cellar</h1><div className="list">{items.map(i=><div className="list-item" key={i.id}><div><h3>{i.product_name}</h3><p>{i.quantity} bottles · purchased {new Date(i.purchased_at).toLocaleString()}</p></div><button onClick={()=>nav(`/resell/${i.product_id}`)}><span>↻</span> Resell</button></div>)}</div></section>}
function Resale(){const [rows,setRows]=useState([]); const load=()=>api('/api/resales').then(d=>setRows(d.listings)).catch(alert); useEffect(load,[]); const buy=async(id)=>{try{await api('/api/resales/buy',{method:'POST',body:JSON.stringify({userId:DEMO_USER.userId, listingId:id, quantity:1})}); load(); alert('Resale purchased and added to cellar.')}catch(e){alert(e.message)}}; return <section><h1>Resale Market</h1><div className="grid">{rows.map(r=><article className="card" key={r.id}><img src={r.image_url}/><h3>{r.product_name}</h3><p>Seller: {r.seller_user_id}</p><p>{r.quantity} available · {money(r.price_cents)} each</p><button className="primary" onClick={()=>buy(r.id)}>Buy Resale</button></article>)}</div></section>}
function Resell({productId, nav}){const [qty,setQty]=useState(1),[price,setPrice]=useState(100),[available,setAvailable]=useState(0); useEffect(()=>{api(`/api/cellar?userId=${DEMO_USER.userId}`).then(d=>setAvailable(d.items.filter(i=>String(i.product_id)===String(productId)).reduce((a,i)=>a+i.quantity,0))).catch(alert)},[productId]); const submit=async()=>{if(qty>available)return alert('Quantity exceeds cellar balance'); try{await api('/api/resales/create',{method:'POST',body:JSON.stringify({userId:DEMO_USER.userId, productId, quantity:Number(qty), priceCents:Math.round(Number(price)*100)})}); nav('/resale')}catch(e){alert(e.message)}}; return <section className="panel narrow"><h1>Resell Bottles</h1><p>Available: {available}</p><label>Quantity<input type="number" min="1" max={available} value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Price USD<input type="number" min="1" value={price} onChange={e=>setPrice(e.target.value)}/></label><button className="primary" onClick={submit}>List for Resale</button></section>}
function List({title,items}){return <section><h1>{title}</h1><div className="list">{items.map((i,idx)=><div className="list-item" key={idx}><div><h3>{i.title}</h3><p>{i.meta}</p></div><span className={`badge ${i.badge}`}>{i.badge}</span></div>)}</div></section>}

createRoot(document.getElementById('root')).render(<App />)
