import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider, usePrivy } from '@privy-io/react-auth'
import './styles.css'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID
const money = (cents) => `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
const api = async (path, options = {}) => {
  const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(json.error || 'Request failed')
  return json
}

function useRoute() {
  const currentPath = () => window.location.pathname || '/'
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const onPop = () => setPath(currentPath())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])
  const nav = (to) => { history.pushState(null, '', to); setPath(currentPath()); scrollTo(0, 0) }
  return [path, nav]
}

function AppShell() {
  if (!PRIVY_APP_ID) return <main><section className="panel narrow"><h1>Missing Privy App ID</h1><p>Set VITE_PRIVY_APP_ID in Cloudflare Pages or your local shell before running the app.</p></section></main>
  return <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email'], appearance: { showWalletLoginFirst: false } }}><AuthenticatedApp /></PrivyProvider>
}

function getPrivyEmail(user) {
  return user?.email?.address || user?.linkedAccounts?.find(account => account.type === 'email')?.address || ''
}

function getPrivyWalletAddress(user) {
  const linkedAccounts = user?.linkedAccounts || []
  const directWallets = [user?.wallet, user?.embeddedWallet].filter(Boolean)
  const wallets = [...directWallets, ...linkedAccounts].filter(account => account?.address)
  const embeddedWallet = wallets.find(account =>
    account.type === 'embedded_wallet' ||
    account.walletClientType === 'privy' ||
    account.connectorType === 'embedded' ||
    account.connectorType === 'privy'
  )
  const linkedWallet = wallets.find(account => account.type === 'wallet')
  return embeddedWallet?.address || linkedWallet?.address || null
}

function AuthenticatedApp() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()
  const [syncingUser, setSyncingUser] = useState(false)
  const isAuthed = ready && authenticated
  const userId = user?.id
  const email = getPrivyEmail(user)
  const walletAddress = getPrivyWalletAddress(user)
  const authApi = async (path, options = {}) => {
    const token = await getAccessToken()
    return api(path, { ...options, headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
  }
  useEffect(() => {
    if (!ready || !isAuthed || !userId) return
    let alive = true
    setSyncingUser(true)
    authApi('/api/users/sync', { method: 'POST', body: JSON.stringify({ privy_user_id: userId, email, wallet_address: walletAddress }) }).catch(e => alert(e.message)).finally(() => { if (alive) setSyncingUser(false) })
    return () => { alive = false }
  }, [ready, isAuthed, userId, email, walletAddress])
  const [path, nav] = useRoute()
  const route = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return { name: parts[0] || 'home', id: parts[1] }
  }, [path])
  const [postLoginPath, setPostLoginPath] = useState('')
  const requireAuth = (nextPath = window.location.pathname) => {
    setPostLoginPath(nextPath)
    if (ready && !isAuthed) login()
  }
  useEffect(() => {
    if (!ready || !postLoginPath) return
    if (isAuthed) {
      nav(postLoginPath)
      setPostLoginPath('')
    } else {
      login()
    }
  }, [ready, isAuthed, postLoginPath])
  return <>
    <header className="nav">
      <button onClick={() => nav('/')} className="brand"><span>🍷</span> TATTOO <span>Wine Marketplace</span></button>
      <nav>
        <button onClick={() => nav('/')}>Home</button>
        <button onClick={() => isAuthed ? nav('/orders') : requireAuth('/orders')}>My Orders</button>
        <button onClick={() => isAuthed ? nav('/cellar') : requireAuth('/cellar')}>My Cellar</button>
        <button onClick={() => nav('/resale')}>Resale Market</button>
        {!ready ? <span className="account-skeleton" aria-label="Account loading" /> : isAuthed ? <button onClick={logout}>Logout</button> : <button onClick={() => requireAuth(window.location.pathname)}>Login / Sign up</button>}
      </nav>
    </header>
    <main>
      {isAuthed && <div className="user-pill">Privy login: {email || userId}{syncingUser ? ' · syncing...' : ''}</div>}
      {route.name === 'home' && <Home nav={nav} />}
      {route.name === 'product' && <Product id={route.id} nav={nav} authenticated={isAuthed} requireAuth={requireAuth} />}
      {route.name === 'checkout' && (isAuthed ? <Checkout productId={route.id} nav={nav} userId={userId} authApi={authApi} /> : <LoginRequired title="Login to checkout" login={() => requireAuth(window.location.pathname + window.location.search)} />)}
      {route.name === 'payment' && (isAuthed ? <Payment orderId={route.id} nav={nav} userId={userId} authApi={authApi} /> : <LoginRequired title="Login to continue payment" login={() => requireAuth(window.location.pathname + window.location.search)} />)}
      {route.name === 'orders' && (isAuthed ? <Orders userId={userId} authApi={authApi} /> : <LoginRequired title="Login to view orders" login={() => requireAuth('/orders')} />)}
      {route.name === 'cellar' && (isAuthed ? <Cellar nav={nav} userId={userId} authApi={authApi} /> : <LoginRequired title="Login to view your cellar" login={() => requireAuth('/cellar')} />)}
      {route.name === 'resale' && <ResaleMarket userId={userId} authApi={authApi} authenticated={isAuthed} requireAuth={requireAuth} />}
      {route.name === 'resell' && (isAuthed ? <Resell productId={route.id} nav={nav} userId={userId} authApi={authApi} /> : <LoginRequired title="Login to resell bottles" login={() => requireAuth(window.location.pathname)} />)}
      {!['home','product','checkout','payment','orders','cellar','resale','resell'].includes(route.name) && <Home nav={nav} />}
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
function Hero(){return <section className="hero"><div><p className="eyebrow">Black-gold wine / Web3 lifestyle testnet</p><h1>Luxury bottles, digital cellar, frictionless resale.</h1><p>Prototype commerce flow for TATTOO Lifestyle collectors with Privy Email OTP and mock Stripe/Web3 flows.</p></div><span className="gem">◆</span></section>}
function LoginRequired({ title, login }) {return <section className="panel narrow"><h1>{title}</h1><p>Please sign in with Privy Email OTP to continue. Public browsing remains available without login.</p><button className="primary" onClick={login}>Login / Sign up</button></section>}
function Product({ id, nav, authenticated, requireAuth }) {
  const [p, setP] = useState(null), [qty,setQty]=useState(1)
  useEffect(()=>{api(`/api/product?id=${id}`).then(d=>setP(d.product)).catch(alert)},[id])
  if(!p) return <p>Loading...</p>
  return <section className="detail"><img src={p.image_url} alt={p.name}/><div className="panel"><p className="eyebrow">Estate reserve</p><h1>{p.name}</h1><p>{p.description}</p><h2>{money(p.price_cents)}</h2><p>{p.stock} bottles available</p><label>Quantity<input type="number" min="1" max={p.stock} value={qty} onChange={e=>setQty(e.target.value)} /></label><button className="primary" onClick={()=>authenticated ? nav(`/checkout/${p.id}?qty=${qty}`) : requireAuth(window.location.pathname)}><span>🛍</span> Buy Now</button></div></section>
}
function Checkout({ productId, nav, userId, authApi }) {
  const qty = Number(new URLSearchParams(location.search).get('qty') || 1), [p,setP]=useState(null), [loading,setLoading]=useState(true), [notFound,setNotFound]=useState(false), [busy,setBusy]=useState(false)
  useEffect(()=>{setLoading(true); setNotFound(false); setP(null); api(`/api/product?id=${encodeURIComponent(productId)}`).then(d=>{setP(d.product); setNotFound(!d.product)}).catch(e=>{if(e.message === 'Product not found') setNotFound(true); else alert(e.message)}).finally(()=>setLoading(false))},[productId])
  const create=async()=>{setBusy(true); try{const d=await authApi('/api/orders/create',{method:'POST',body:JSON.stringify({userId, productId, quantity:qty})}); nav(`/payment/${d.order.id}`)}catch(e){alert(e.message)}finally{setBusy(false)}}
  if(loading) return <section className="panel narrow"><h1>Checkout</h1><p>Loading product...</p></section>
  if(notFound || !p) return <section className="panel narrow"><h1>Product not found</h1><p>The selected product could not be found. Please return home and choose another bottle.</p><button className="primary" onClick={()=>nav('/')}>Back Home</button></section>
  return <section className="panel narrow"><h1>Checkout</h1><p>{p.name} × {qty}</p><h2>Total {money(p.price_cents*qty)}</h2><button className="primary" disabled={busy} onClick={create}>Proceed to Payment</button></section>
}
function Payment({ orderId, nav, userId, authApi }) {
  const [busy,setBusy]=useState(false)
  const pay=async()=>{setBusy(true); try{await authApi('/api/orders/pay',{method:'POST',body:JSON.stringify({userId, orderId})}); nav('/cellar')}catch(e){alert(e.message)}finally{setBusy(false)}}
  return <section className="panel narrow stripe"><h1>Stripe-style secure payment</h1><input placeholder="4242 4242 4242 4242"/><div className="row"><input placeholder="MM / YY"/><input placeholder="CVC"/></div><input placeholder="Cardholder name"/><button className="primary" disabled={busy} onClick={pay}>Pay Successfully</button></section>
}
function Orders({userId, authApi}){const [orders,setOrders]=useState([]); useEffect(()=>{authApi(`/api/orders?userId=${encodeURIComponent(userId)}`).then(d=>setOrders(d.orders)).catch(alert)},[userId]); return <List title="My Orders" items={orders.map(o=>({title:`#${o.id} ${o.product_name}`, meta:`${o.quantity} · ${money(o.total_cents)} · ${new Date(o.created_at).toLocaleString()}`, badge:o.status}))}/>}
function Cellar({nav, userId, authApi}){const [items,setItems]=useState([]); useEffect(()=>{authApi(`/api/cellar?userId=${encodeURIComponent(userId)}`).then(d=>setItems(d.items)).catch(alert)},[userId]); return <section><h1>My Cellar</h1><div className="list">{items.map(i=><div className="list-item" key={i.id}><div><h3>{i.product_name}</h3><p>{i.quantity} bottles · purchased {new Date(i.purchased_at).toLocaleString()}</p></div><button onClick={()=>nav(`/resell/${i.product_id}`)}><span>↻</span> Resell</button></div>)}</div></section>}
function ResaleMarket({userId, authApi, authenticated, requireAuth}){const [rows,setRows]=useState([]),[loading,setLoading]=useState(true); const load=async(active=()=>true)=>{setLoading(true); try{const d=await api('/api/resales'); if(active()) setRows(d.listings || [])}catch(e){if(active()) alert(e.message)}finally{if(active()) setLoading(false)}}; useEffect(()=>{let alive=true; load(()=>alive); return()=>{alive=false}},[]); const buy=async(id)=>{if(!authenticated) return requireAuth('/resale'); try{await authApi('/api/resales/buy',{method:'POST',body:JSON.stringify({userId, listingId:id, quantity:1})}); await load(); alert('Resale purchased and added to cellar.')}catch(e){alert(e.message)}}; return <section><h1>Resale Market</h1>{loading && <p>Loading resale listings...</p>}<div className="grid">{rows.map(r=><article className="card" key={r.id}><img src={r.image_url} alt={r.product_name}/><h3>{r.product_name}</h3><p>Seller: {r.seller_user_id}</p><p>{r.quantity} available · {money(r.price_cents)} each</p><button className="primary" onClick={()=>buy(r.id)}>Buy Resale</button></article>)}</div></section>}
function Resell({productId, nav, userId, authApi}){const [qty,setQty]=useState(1),[price,setPrice]=useState(100),[available,setAvailable]=useState(0); useEffect(()=>{authApi(`/api/cellar?userId=${encodeURIComponent(userId)}`).then(d=>setAvailable(d.items.filter(i=>String(i.product_id)===String(productId)).reduce((a,i)=>a+i.quantity,0))).catch(alert)},[productId]); const submit=async()=>{if(qty>available)return alert('Quantity exceeds cellar balance'); try{await authApi('/api/resales/create',{method:'POST',body:JSON.stringify({userId, productId, quantity:Number(qty), priceCents:Math.round(Number(price)*100)})}); nav('/resale')}catch(e){alert(e.message)}}; return <section className="panel narrow"><h1>Resell Bottles</h1><p>Available: {available}</p><label>Quantity<input type="number" min="1" max={available} value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Price USD<input type="number" min="1" value={price} onChange={e=>setPrice(e.target.value)}/></label><button className="primary" onClick={submit}>List for Resale</button></section>}
function List({title,items}){return <section><h1>{title}</h1><div className="list">{items.map((i,idx)=><div className="list-item" key={idx}><div><h3>{i.title}</h3><p>{i.meta}</p></div><span className={`badge ${i.badge}`}>{i.badge}</span></div>)}</div></section>}

createRoot(document.getElementById('root')).render(<AppShell />)
