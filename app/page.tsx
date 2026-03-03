"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

type Photo = {
  id: string
  title: string
  image_url: string
  location: string
  shoot_time: string
  description: string
  params: string
  like_count: number
}

type Group = {
  dateKey: string
  locationString: string
  list: Photo[]
}

type Ripple = { id: string; x: number; y: number }

function toDateKey(shootTime: string) {
  if (!shootTime) return ""
  const first10 = shootTime.slice(0, 10)
  return first10.replaceAll("/", "-") // YYYY-MM-DD
}

function displayDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-")
  if (!y || !m || !d) return dateKey
  return `${y}/${m}/${d}`
}

/** ✅ 更明显的点击波纹（双环+光晕），但不影响点击 */
const ClickRipples = React.memo(function ClickRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random()

        setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }])
        window.setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id))
        }, 760)
      })
    }

    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            className="absolute"
            style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.76, ease: "easeOut" }}
          >
            {/* 光晕 */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 18,
                height: 18,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.10)",
              }}
              initial={{ scale: 0.22, opacity: 0.55 }}
              animate={{ scale: 9.5, opacity: 0 }}
              transition={{ duration: 0.76, ease: "easeOut" }}
            />
            {/* 外环1 */}
            <motion.div
              className="absolute rounded-full border"
              style={{
                width: 20,
                height: 20,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                borderColor: "rgba(0,0,0,0.32)",
              }}
              initial={{ scale: 0.22, opacity: 0.95 }}
              animate={{ scale: 10.5, opacity: 0 }}
              transition={{ duration: 0.76, ease: "easeOut" }}
            />
            {/* 外环2 */}
            <motion.div
              className="absolute rounded-full border"
              style={{
                width: 20,
                height: 20,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                borderColor: "rgba(0,0,0,0.16)",
              }}
              initial={{ scale: 0.38, opacity: 0.8 }}
              animate={{ scale: 13.8, opacity: 0 }}
              transition={{ duration: 0.92, ease: "easeOut" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

/** ✅ 右侧纯文字浮层 */
const RightIndicator = React.memo(function RightIndicator(props: {
  activeTime: string
  activeLocation: string
}) {
  const { activeTime, activeLocation } = props
  return (
    <div className="fixed right-4 md:right-6 lg:right-8 top-1/2 -translate-y-1/2 pointer-events-none text-right select-none z-40">
      <AnimatePresence mode="wait">
        {activeTime && (
          <motion.div
            key={activeTime + activeLocation}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="text-gray-400"
          >
            <div className="text-sm tracking-wide">{displayDate(activeTime)}</div>
            <div className="text-xs mt-1 text-gray-400/80">{activeLocation}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

/** ✅ 骨架卡片：加载时也保持页面“有东西”，不闪屏 */
function SkeletonGrid() {
  return (
    <div className="max-w-7xl mx-auto px-8 pb-40">
      {[0, 1, 2].map((g) => (
        <div key={g} className="mb-28">
          <div className="h-8 w-64 bg-gray-100 rounded-lg mb-10" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-full h-[280px] md:h-[320px] lg:h-[360px] rounded-2xl bg-gray-100" />
                <div className="mt-5 h-4 w-32 bg-gray-100 rounded" />
                <div className="mt-3 h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** ✅ 网格：memo，减少滚动期间重绘 */
const Gallery = React.memo(function Gallery(props: {
  grouped: Group[]
  headerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  onSelect: (p: Photo) => void
  onLike: (p: Photo) => void
}) {
  const { grouped, headerRefs, onSelect, onLike } = props
  return (
    <div className="max-w-7xl mx-auto px-8 pb-40">
      {grouped.map(({ dateKey, list, locationString }) => (
        <div key={dateKey} className="photo-group mb-28">
          <div
            ref={(el) => {
              headerRefs.current[dateKey] = el
            }}
            data-time={dateKey}
            data-location={locationString}
            className="text-3xl font-semibold mb-10 tracking-wide"
          >
            {displayDate(dateKey)}
            {locationString ? ` · ${locationString}` : ""}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {list.map((photo) => (
              <motion.div
                key={photo.id}
                className="cursor-pointer group flex flex-col items-center"
                onClick={() => onSelect(photo)}
                whileHover={{ scale: 1.02 }}
              >
                {/* ✅ 永远浅色底：图片加载/解码慢也不黑 */}
                <div className="w-full h-[280px] md:h-[320px] lg:h-[360px] overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    src={photo.image_url}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105 bg-white"
                    alt={photo.title}
                  />
                </div>

                <div className="text-center mt-5 w-full">
                  <div className="font-medium mb-2">{photo.title}</div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onLike(photo)
                    }}
                    className="text-gray-400 hover:text-red-500 text-sm transition"
                  >
                    ❤ {photo.like_count}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

/** ✅ 弹窗：白底留白，信息居中更大 */
const PhotoModal = React.memo(function PhotoModal(props: {
  selected: Photo | null
  onClose: () => void
  onLike: (p: Photo) => void
}) {
  const { selected, onClose, onLike } = props

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-w-5xl w-full bg-white rounded-2xl overflow-hidden shadow-xl"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white px-6 pt-10 pb-6">
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={selected.image_url}
                  decoding="async"
                  className="w-full max-h-[64vh] object-contain bg-white"
                  alt={selected.title}
                />
              </div>

              <button
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-black rounded-full px-3 py-1 text-sm"
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <div className="px-8 pb-10 text-center">
              <div className="text-2xl md:text-3xl font-semibold tracking-wide">
                {selected.title || "—"}
              </div>

              <div className="mt-4 text-lg md:text-xl text-gray-700">
                <span className="text-gray-900">拍摄地：</span>
                {selected.location || "—"}
              </div>

              <div className="mt-2 text-lg md:text-xl text-gray-700">
                <span className="text-gray-900">拍摄设备：</span>
                {selected.params || "—"}
              </div>

              <div className="mt-2 text-base md:text-lg text-gray-500">
                {displayDate(toDateKey(selected.shoot_time))}
              </div>

              {selected.description ? (
                <p className="mt-7 text-lg md:text-xl text-gray-700 leading-relaxed mx-auto max-w-3xl">
                  {selected.description}
                </p>
              ) : null}

              <button
                onClick={() => onLike(selected)}
                className="mt-7 text-lg md:text-xl text-gray-500 hover:text-red-500 transition"
              >
                ❤ {selected.like_count}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selected, setSelected] = useState<Photo | null>(null)
  const [activeTime, setActiveTime] = useState("")
  const [activeLocation, setActiveLocation] = useState("")
  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const pendingLikesRef = useRef<Set<string>>(new Set())
  const initialRankRef = useRef<Map<string, number>>(new Map())
  const headerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  /** ✅ 彻底避免刷新时“黑底闪一下” */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.backgroundColor
    const prevBodyBg = body.style.backgroundColor
    const prevColorScheme = (html.style as any).colorScheme

    html.style.backgroundColor = "#ffffff"
    body.style.backgroundColor = "#ffffff"
    ;(html.style as any).colorScheme = "light"

    return () => {
      html.style.backgroundColor = prevHtmlBg
      body.style.backgroundColor = prevBodyBg
      ;(html.style as any).colorScheme = prevColorScheme
    }
  }, [])

  /** ✅ 刷新点赞不丢：不依赖 relationship，不依赖 photos.like_count，直接从 likes 统计 */
  useEffect(() => {
    let alive = true

    async function fetchPhotos() {
      setFatalError(null)
      setLoading(true)

      const { data: photoRows, error: photoErr } = await supabase
        .from("photos")
        .select("id,title,image_url,location,shoot_time,description,params")
        .order("shoot_time", { ascending: false })

      if (!alive) return

      if (photoErr) {
        console.error("photos select error:", JSON.stringify(photoErr, null, 2))
        setFatalError("无法加载照片数据（photos 查询失败）")
        setLoading(false)
        return
      }

      const base = (photoRows || []) as Omit<Photo, "like_count">[]
      const ids = base.map((p) => p.id)

      let counts: Record<string, number> = {}
      if (ids.length) {
        const { data: likeRows, error: likeErr } = await supabase
          .from("likes")
          .select("photo_id")
          .in("photo_id", ids)

        if (likeErr) {
          console.error("likes select error:", JSON.stringify(likeErr, null, 2))
          counts = {}
        } else {
          counts = {}
          for (const row of likeRows || []) {
            const pid = (row as any).photo_id as string
            counts[pid] = (counts[pid] || 0) + 1
          }
        }
      }

      const list: Photo[] = base.map((p) => ({
        ...p,
        like_count: counts[p.id] || 0,
      }))

      if (!alive) return
      setPhotos(list)
      setLoading(false)

      // ✅ 冻结排序：刷新后按最新 like_count 排一次，页面内点赞不重新排序
      const rank = new Map<string, number>()
      const byDate: Record<string, Photo[]> = {}
      for (const p of list) {
        const key = toDateKey(p.shoot_time)
        if (!byDate[key]) byDate[key] = []
        byDate[key].push(p)
      }
      Object.keys(byDate).forEach((k) => {
        byDate[k].sort((a, b) => b.like_count - a.like_count)
        byDate[k].forEach((p, idx) => rank.set(p.id, idx))
      })
      initialRankRef.current = rank
    }

    fetchPhotos()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "auto"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [selected])

  const grouped = useMemo<Group[]>(() => {
    const map: Record<string, Photo[]> = {}
    for (const p of photos) {
      const key = toDateKey(p.shoot_time)
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(p)
    }

    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const ra = initialRankRef.current.get(a.id) ?? 0
        const rb = initialRankRef.current.get(b.id) ?? 0
        return ra - rb
      })
    }

    return Object.entries(map)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([dateKey, list]) => {
        const uniqueLocations = [...new Set(list.map((p) => p.location).filter(Boolean))]
        const locationString = uniqueLocations.length ? uniqueLocations.join(" / ") : ""
        return { dateKey, list, locationString }
      })
  }, [photos])

  /** ✅ 右侧滚动指示：低频更新，避免滚动闪屏 */
  useEffect(() => {
    if (!grouped.length) return

    const headers = grouped
      .map((g) => headerRefs.current[g.dateKey])
      .filter(Boolean) as HTMLDivElement[]
    if (!headers.length) return

    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          const viewportCenter = window.innerHeight / 2
          const visible = entries
            .filter((e) => e.isIntersecting)
            .map((e) => {
              const rect = (e.target as HTMLElement).getBoundingClientRect()
              const center = rect.top + rect.height / 2
              return { el: e.target as HTMLElement, dist: Math.abs(center - viewportCenter) }
            })

          if (!visible.length) return
          visible.sort((a, b) => a.dist - b.dist)
          const best = visible[0].el

          const newTime = best.getAttribute("data-time") || ""
          const newLoc = best.getAttribute("data-location") || ""
          setActiveTime((prev) => (prev === newTime ? prev : newTime))
          setActiveLocation((prev) => (prev === newLoc ? prev : newLoc))
        })
      },
      { threshold: 0.01, rootMargin: "-45% 0px -45% 0px" }
    )

    headers.forEach((h) => observer.observe(h))
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [grouped])

  /** ✅ 点赞：每张照片每天一次（不限当天点赞的照片数量） */
  const likePhoto = useCallback(async (photo: Photo) => {
    if (pendingLikesRef.current.has(photo.id)) return
    pendingLikesRef.current.add(photo.id)

    const token = localStorage.getItem("visitor_token") || crypto.randomUUID()
    localStorage.setItem("visitor_token", token)

    const today = new Date().toISOString().split("T")[0]
    const localKey = `liked_${token}_${photo.id}_${today}`

    if (localStorage.getItem(localKey) === "1") {
      alert("这张照片今天已经点赞过了")
      pendingLikesRef.current.delete(photo.id)
      return
    }

    // UI 先 +1（立即反馈，不重排）
    localStorage.setItem(localKey, "1")
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, like_count: p.like_count + 1 } : p))
    )
    setSelected((prev) =>
      prev && prev.id === photo.id ? { ...prev, like_count: prev.like_count + 1 } : prev
    )

    try {
      // 服务端确认：同一张照片当天是否点过
      const { data: existed, error: checkErr } = await supabase
        .from("likes")
        .select("id")
        .eq("user_token", token)
        .eq("photo_id", photo.id)
        .gte("created_at", today)

      if (checkErr) throw checkErr

      if (existed && existed.length > 0) {
        alert("这张照片今天已经点赞过了")
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, like_count: p.like_count - 1 } : p))
        )
        setSelected((prev) =>
          prev && prev.id === photo.id ? { ...prev, like_count: prev.like_count - 1 } : prev
        )
        return
      }

      // 真正持久化
      const { error: insErr } = await supabase.from("likes").insert({
        photo_id: photo.id,
        user_token: token,
      })
      if (insErr) throw insErr
    } catch (err) {
      console.error("Like failed:", JSON.stringify(err, null, 2))
      alert("点赞未能保存到云端（likes 表 insert 被权限拦截或网络问题）。")

      localStorage.removeItem(localKey)
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, like_count: p.like_count - 1 } : p))
      )
      setSelected((prev) =>
        prev && prev.id === photo.id ? { ...prev, like_count: prev.like_count - 1 } : prev
      )
    } finally {
      pendingLikesRef.current.delete(photo.id)
    }
  }, [])

  const onSelect = useCallback((p: Photo) => setSelected(p), [])
  const onClose = useCallback(() => setSelected(null), [])

  return (
    <main className="bg-white min-h-screen text-black relative overflow-x-hidden">
      {/* ✅ 波纹 */}
      <ClickRipples />

      {/* ✅ 左侧极简氛围（静态，不搞大动画，避免重绘黑屏） */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="hidden md:block absolute left-0 top-0 h-full w-24">
          <div
            className="absolute left-8 top-0 h-full w-px opacity-60"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.10), transparent)",
            }}
          />
          <div
            className="absolute left-0 top-0 h-full w-24"
            style={{
              background: "radial-gradient(closest-side at 30% 25%, rgba(0,0,0,0.03), transparent 70%)",
            }}
          />
        </div>
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto text-center pt-24 px-6">
          <img
            src="/avatar.jpg"
            className="w-28 h-28 rounded-full mx-auto mb-6 object-cover transition hover:scale-105"
            alt="avatar"
          />
          <h1 className="text-4xl font-bold tracking-wider mb-4">Nodoby</h1>
          <p className="text-gray-500 mb-20">城市纪实 · 光影记录</p>
        </div>

        {/* ✅ 永远渲染右侧（loading 时为空，不闪屏） */}
        <RightIndicator activeTime={activeTime} activeLocation={activeLocation} />

        {/* ✅ 永远不整屏切换：loading 用骨架，避免“黑/白闪一下” */}
        {fatalError ? (
          <div className="max-w-4xl mx-auto px-8 pb-40 text-gray-600">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
              {fatalError}
            </div>
          </div>
        ) : loading ? (
          <SkeletonGrid />
        ) : (
          <Gallery grouped={grouped} headerRefs={headerRefs} onSelect={onSelect} onLike={likePhoto} />
        )}

        <PhotoModal selected={selected} onClose={onClose} onLike={likePhoto} />
      </div>
    </main>
  )
}