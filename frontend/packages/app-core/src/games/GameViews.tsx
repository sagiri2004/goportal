import React from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Tabs, TabsList, TabsTrigger } from '@goportal/ui'
import { ArrowLeft, Flame, Gamepad2, Library, Maximize2, Minimize2, Play, RefreshCcw, Search, Sparkles, Star, Store, TrendingUp, UploadCloud, Volume2, VolumeX } from 'lucide-react'
import {
  createGame,
  getGame,
  createPlaySession,
  createGameEvent,
  createGameRoom,
  listMyGames,
  listReviews,
  listTrendingGames,
  listGames,
  leaveGameRoom,
  searchGames,
  shareGameToChannel,
  startGameSession,
  submitGameForReview,
  joinGameRoom,
  getGameRoomState,
  uploadMedia,
  uploadGameBuild,
  GameWsClient,
  type GameRoomRealtimeEvent,
  type GameWithBuildDTO,
  type GameReviewDTO,
} from '../services'
import { useAuthStore } from '@goportal/store'
import { GameSharePickerDialog, type SharePickerAction } from './GameSharePickerDialog'

const resolvePlayURL = (rawURL: string): string => {
  if (/^https?:\/\//i.test(rawURL)) {
    return rawURL
  }

  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const baseURL = viteEnv?.VITE_API_URL ?? 'http://localhost:8080'
  return new URL(rawURL, baseURL).toString()
}

const fallbackCardGradients = [
  'from-indigo-500/30 to-cyan-500/20',
  'from-fuchsia-500/30 to-violet-500/20',
  'from-emerald-500/30 to-lime-500/20',
  'from-orange-500/30 to-rose-500/20',
]

const formatPlayCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  return `${count}`
}

const normalizeOptionalID = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

const GameTile: React.FC<{
  item: GameWithBuildDTO
  index: number
}> = ({ item, index }) => {
  const detailHref = `/games/${item.game.id}`
  const playHref = `/games/${item.game.id}/play`
  return (
    <div className="group w-full overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/85 transition hover:-translate-y-1 hover:border-zinc-500">
      <div className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${fallbackCardGradients[index % fallbackCardGradients.length]}`}>
        <Link to={detailHref} className="block h-full w-full">
          {item.game.thumbnail_url ? (
            <img
              src={item.game.thumbnail_url}
              alt={item.game.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-foreground/80">
              {item.game.category || 'Featured game'}
            </div>
          )}
        </Link>
        <div className="absolute left-2 top-2 rounded-full border border-border/60 bg-black/35 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90">
          {item.game.source_type}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-black/65 opacity-0 transition group-hover:opacity-100" />
        <div className="absolute inset-x-2 bottom-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <Link
            to={playHref}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
          >
            <Play className="h-3.5 w-3.5" />
            Play
          </Link>
          <Link
            to={detailHref}
            className="inline-flex flex-1 items-center justify-center rounded-md border border-zinc-500 bg-black/60 px-2 py-1 text-[11px] font-medium text-zinc-100"
          >
            Details
          </Link>
        </div>
      </div>
      <div className="space-y-1 p-2.5">
        <Link to={detailHref} className="line-clamp-1 text-xs font-semibold text-zinc-100 hover:underline">
          {item.game.title}
        </Link>
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <Star className="h-2.5 w-2.5 text-amber-400" />
            {item.game.avg_rating.toFixed(1)}
          </span>
          <span>{formatPlayCount(item.game.launch_count)} plays</span>
        </div>
      </div>
    </div>
  )
}

export const GamesCatalogPage: React.FC = () => {
  const [items, setItems] = React.useState<GameWithBuildDTO[]>([])
  const [featured, setFeatured] = React.useState<GameWithBuildDTO[]>([])
  const [myGames, setMyGames] = React.useState<GameWithBuildDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeSourceType, setActiveSourceType] = React.useState<'system' | 'community'>('system')
  const [sortMode, setSortMode] = React.useState<'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured'>('trending')
  const [searchKeyword, setSearchKeyword] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [market, trending, mine] = await Promise.all([
          listGames({
            source_type: activeSourceType,
            sort: sortMode,
            limit: 40,
          }),
          listTrendingGames({
            source_type: activeSourceType,
            limit: 8,
          }),
          listMyGames().catch(() => []),
        ])
        if (!cancelled) {
          setItems(market)
          setFeatured(trending)
          setMyGames(mine)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load games')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [activeSourceType, sortMode])

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = searchKeyword.trim()
        ? await searchGames({
            q: searchKeyword.trim(),
            source_type: activeSourceType,
            limit: 40,
          })
        : await listGames({
            source_type: activeSourceType,
            sort: sortMode,
            limit: 40,
          })
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search games')
    } finally {
      setLoading(false)
    }
  }

  const topGames = React.useMemo(() => items.slice(0, 12), [items])
  const communityPick = React.useMemo(
    () => items.filter((item) => item.game.source_type === 'community').slice(0, 6),
    [items],
  )
  const heroGame = featured[0] ?? topGames[0]
  const rankedTrending = React.useMemo(() => featured.slice(0, 8), [featured])

  return (
    <div className="min-h-screen bg-[hsl(224,18%,9%)]">
      <div className="w-full px-0">
        <div className="overflow-hidden border-y border-zinc-700/70 bg-[hsl(224,16%,11%)] shadow-2xl">
          <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
            <aside className="border-r border-zinc-800/80 bg-[hsl(224,18%,10%)] p-4">
              <div className="mb-5 flex items-center gap-2 px-1 py-1">
                <div className="rounded-lg bg-blue-500/20 p-1.5">
                  <Gamepad2 className="h-4 w-4 text-blue-300" />
                </div>
                <span className="text-sm font-semibold text-zinc-100">GoPortal</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex w-full items-center gap-2 rounded-lg bg-blue-500/20 px-2.5 py-2 text-left text-sm text-blue-200">
                  <Store className="h-4 w-4" />
                  Store
                </div>
                <Link
                  to="/games/developer"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                >
                  <UploadCloud className="h-4 w-4" />
                  Developer Console
                </Link>
              </div>

              <div className="mt-5 border-t border-zinc-800/80 pt-4">
                <div className="px-1 text-[11px] uppercase tracking-wide text-zinc-500">Your games</div>
                <div className="mt-2 space-y-1">
                  {(myGames.slice(0, 4).length > 0 ? myGames.slice(0, 4) : topGames.slice(0, 4)).map((item) => (
                    <Link
                      key={`installed-${item.game.id}`}
                      to={`/games/${item.game.id}/play`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                    >
                      <div className="h-8 w-8 overflow-hidden rounded bg-zinc-800">
                        {item.game.icon_url || item.game.thumbnail_url ? (
                          <img
                            src={item.game.icon_url ?? item.game.thumbnail_url}
                            alt={item.game.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                            {item.game.title.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-1">{item.game.title}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Link
                  to="/app"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800/70"
                >
                  <Library className="h-4 w-4" />
                  Back to app
                </Link>
              </div>
            </aside>

            <main className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-zinc-100">Game Library</h1>
                  <p className="text-xs text-zinc-400">Discover and play games in GoPortal ecosystem.</p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Tabs value={activeSourceType} onValueChange={(value) => setActiveSourceType(value as 'system' | 'community')}>
                  <TabsList>
                    <TabsTrigger value="system">System</TabsTrigger>
                    <TabsTrigger value="community">Community</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="mb-4 grid gap-2 md:grid-cols-[1fr_auto]">
                <form onSubmit={onSearch} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder={`Search ${activeSourceType} games`}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-9 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                  />
                </form>
                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(event.target.value as 'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured')
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="trending">Trending</option>
                  <option value="top_rated">Top rated</option>
                  <option value="newest">Newest</option>
                  <option value="most_played">Most played</option>
                  <option value="featured">Featured</option>
                </select>
              </div>

              {loading ? (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-6 text-sm text-zinc-400">
                  Loading games...
                </div>
              ) : null}
              {error ? (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
              ) : null}

              {!loading && !error ? (
                <>
                  {heroGame ? (
                    <section className="mb-4 grid gap-3 xl:grid-cols-[2fr_1fr]">
                      <Link
                        to={`/games/${heroGame.game.id}/play`}
                        className="group relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950"
                      >
                        <div className="absolute inset-0">
                          {heroGame.game.hero_image_url || heroGame.game.thumbnail_url ? (
                            <img
                              src={heroGame.game.hero_image_url ?? heroGame.game.thumbnail_url}
                              alt={heroGame.game.title}
                              className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-r from-blue-700/40 to-cyan-700/30" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
                        <div className="relative z-10 p-5 md:p-6">
                          <div className="inline-flex items-center gap-1 rounded-full border border-zinc-500/80 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-100">
                            <Flame className="h-3 w-3 text-orange-400" />
                            Top pick
                          </div>
                          <h2 className="mt-2 text-2xl font-bold text-white">{heroGame.game.title}</h2>
                          <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-zinc-200/90">
                            {heroGame.game.description ?? 'Jump in and start playing now.'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-200">
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-1">
                              <Star className="h-3.5 w-3.5 text-amber-400" />
                              {heroGame.game.avg_rating.toFixed(1)} ({heroGame.game.rating_count})
                            </span>
                            <span className="rounded-md bg-black/45 px-2 py-1">{formatPlayCount(heroGame.game.launch_count)} plays</span>
                          </div>
                        </div>
                      </Link>
                      <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                          <TrendingUp className="h-4 w-4 text-indigo-400" />
                          Trending now
                        </div>
                        <div className="space-y-2">
                          {rankedTrending.map((item, index) => (
                            <Link
                              key={`rank-${item.game.id}`}
                              to={`/games/${item.game.id}/play`}
                              className="flex items-center gap-3 rounded-lg border border-zinc-700/60 bg-zinc-950/80 px-2.5 py-2 hover:border-zinc-500"
                            >
                              <span className="w-4 text-center text-xs font-semibold text-zinc-300">{index + 1}</span>
                              <div className="min-w-0 flex-1">
                                <div className="line-clamp-1 text-sm text-zinc-100">{item.game.title}</div>
                                <div className="text-[11px] text-zinc-400">{formatPlayCount(item.game.launch_count)} plays</div>
                              </div>
                              <span className="text-[11px] text-amber-300">{item.game.avg_rating.toFixed(1)}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="mb-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      Based on your library
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                      {topGames.map((item, index) => (
                        <GameTile key={`based-${item.game.id}`} item={item} index={index} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      <Store className="h-4 w-4 text-emerald-400" />
                      Community picks
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                      {communityPick.map((item, index) => (
                        <GameTile key={`community-${item.game.id}`} item={item} index={index} />
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

export const GamesDeveloperPage: React.FC = () => {
  const navigate = useNavigate()
  const [myGames, setMyGames] = React.useState<GameWithBuildDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [submitReviewState, setSubmitReviewState] = React.useState<Record<string, boolean>>({})
  const [title, setTitle] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [tags, setTags] = React.useState('')
  const [ageRating, setAgeRating] = React.useState('')
  const [trailerURL, setTrailerURL] = React.useState('')
  const [version, setVersion] = React.useState('v1.0.0')
  const [bundle, setBundle] = React.useState<File | null>(null)
  const [iconFile, setIconFile] = React.useState<File | null>(null)
  const [capsuleFile, setCapsuleFile] = React.useState<File | null>(null)
  const [heroFile, setHeroFile] = React.useState<File | null>(null)
  const [screenshotFiles, setScreenshotFiles] = React.useState<File[]>([])
  const [developerTab, setDeveloperTab] = React.useState<'publish' | 'integration'>('publish')
  const [allowScoreShare, setAllowScoreShare] = React.useState(true)
  const [allowAchievementShare, setAllowAchievementShare] = React.useState(true)
  const [allowMultiplayer, setAllowMultiplayer] = React.useState(true)
  const [maxPlayers, setMaxPlayers] = React.useState(8)

  const sdkSnippet = React.useMemo(
    () => `window.parent.postMessage({
  type: 'GOPORTAL_SDK_REQUEST',
  request_id: crypto.randomUUID(),
  action: 'init',
  payload: {
    channel_id: '<chat-channel-id>',
    metadata: {
      allow_score_share: ${allowScoreShare},
      allow_achievement_share: ${allowAchievementShare},
      allow_multiplayer: ${allowMultiplayer},
      max_players: ${Math.min(8, Math.max(2, maxPlayers))}
    }
  }
}, '*')`,
    [allowAchievementShare, allowMultiplayer, allowScoreShare, maxPlayers]
  )

  const refreshMyGames = React.useCallback(async () => {
    const mine = await listMyGames()
    setMyGames(mine)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const mine = await listMyGames()
        if (!cancelled) {
          setMyGames(mine)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load your games')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!bundle) {
      setUploadError('Please choose a .zip game bundle first.')
      return
    }
    if (!title.trim() || !slug.trim()) {
      setUploadError('Title and slug are required.')
      return
    }
    if (!iconFile || !capsuleFile || !heroFile || screenshotFiles.length === 0) {
      setUploadError('Steam-like assets required: icon, capsule, hero image, and at least 1 screenshot.')
      return
    }
    if (screenshotFiles.length > 8) {
      setUploadError('Maximum 8 screenshots.')
      return
    }

    setIsSubmitting(true)
    setUploadError(null)
    try {
      const [iconUploaded, capsuleUploaded, heroUploaded] = await Promise.all([
        uploadMedia(iconFile, 'game_asset'),
        uploadMedia(capsuleFile, 'game_asset'),
        uploadMedia(heroFile, 'game_asset'),
      ])
      const screenshotUploads = await Promise.all(
        screenshotFiles.map((file) => uploadMedia(file, 'game_asset')),
      )

      const game = await createGame({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        thumbnail_url: capsuleUploaded.url,
        icon_url: iconUploaded.url,
        capsule_image_url: capsuleUploaded.url,
        hero_image_url: heroUploaded.url,
        screenshot_urls: screenshotUploads.map((item) => item.url),
        trailer_url: trailerURL.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        age_rating: ageRating.trim() || undefined,
        visibility: 'public',
      })
      await uploadGameBuild(game.id, bundle, version.trim() || undefined)
      await submitGameForReview(game.id)
      await refreshMyGames()
      navigate(`/games/${game.id}/play`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload game.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(240,25%,16%),hsl(240,18%,8%))]">
      <div className="mx-auto w-full max-w-6xl px-6 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Developer Console</h1>
            <p className="mt-1 text-sm text-muted-foreground">Publish and manage your community games.</p>
          </div>
          <Link
            to="/games"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card/80 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Developer tools</div>
            <Tabs value={developerTab} onValueChange={(value) => setDeveloperTab(value as 'publish' | 'integration')}>
              <TabsList>
                <TabsTrigger value="publish">Publish</TabsTrigger>
                <TabsTrigger value="integration">Integration</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {developerTab === 'publish' ? (
            <form onSubmit={onSubmit}>
              <div className="mb-3 text-sm font-semibold">Publish new game build</div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Game title"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="game-slug"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (e.g puzzle, shooter)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={ageRating}
                  onChange={(e) => setAgeRating(e.target.value)}
                  placeholder="Age rating (e.g everyone)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={trailerURL}
                  onChange={(e) => setTrailerURL(e.target.value)}
                  placeholder="Trailer URL (optional)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <label className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Game icon (required)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground"
                  />
                </label>
                <label className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Capsule image (required)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCapsuleFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground"
                  />
                </label>
                <label className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Hero image (required)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground"
                  />
                </label>
                <label className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Screenshots (required, max 8)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setScreenshotFiles(Array.from(e.target.files ?? []))}
                    className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground"
                  />
                </label>
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(e) => setBundle(e.target.files?.[0] ?? null)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Icon: {iconFile?.name ?? 'missing'}</span>
                <span>Capsule: {capsuleFile?.name ?? 'missing'}</span>
                <span>Hero: {heroFile?.name ?? 'missing'}</span>
                <span>Screenshots: {screenshotFiles.length}</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {uploadError ? <div className="mt-2 text-sm text-red-400">{uploadError}</div> : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isSubmitting ? 'Uploading...' : 'Create & Upload'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Configure game social integration flags for your HTML game runtime.
              </div>
              <div className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                SDK source: <code>game-sdk/browser/goportal-game-sdk.js</code> | Docs: <code>game-sdk/README.md</code>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/games/sdk/docs"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
                >
                  Open Frontend SDK Docs (EN/VI)
                </Link>
                <span className="text-xs text-muted-foreground">Professional guide with full examples for HTML + React/Vite</span>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">
                Allow score share
                <input type="checkbox" checked={allowScoreShare} onChange={(e) => setAllowScoreShare(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">
                Allow achievement share
                <input
                  type="checkbox"
                  checked={allowAchievementShare}
                  onChange={(e) => setAllowAchievementShare(e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">
                Allow multiplayer rooms
                <input type="checkbox" checked={allowMultiplayer} onChange={(e) => setAllowMultiplayer(e.target.checked)} />
              </label>
              <label className="block rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">
                Max players (2-8)
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value) || 8)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
                />
              </label>
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">SDK init snippet</div>
                <textarea
                  readOnly
                  value={sdkSnippet}
                  className="min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4 md:p-5">
          <div className="mb-2 text-sm font-semibold">My games</div>
          {loading ? <div className="text-sm text-muted-foreground">Loading your games...</div> : null}
          {error ? <div className="text-sm text-red-400">{error}</div> : null}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {myGames.map((item) => (
              <div key={`mine-${item.game.id}`} className="rounded-md border border-border bg-background p-3">
                <div className="text-sm font-medium">{item.game.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  state: {item.game.publish_state} | latest build: {item.build?.version ?? 'none'}
                </div>
                <button
                  type="button"
                  disabled={submitReviewState[item.game.id]}
                  onClick={async () => {
                    setSubmitReviewState((prev) => ({ ...prev, [item.game.id]: true }))
                    try {
                      await submitGameForReview(item.game.id)
                      await refreshMyGames()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to submit for review')
                    } finally {
                      setSubmitReviewState((prev) => ({ ...prev, [item.game.id]: false }))
                    }
                  }}
                  className="mt-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60"
                >
                  {submitReviewState[item.game.id] ? 'Submitting...' : 'Submit for admin review'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const GameDetailPage: React.FC = () => {
  const { gameId = '' } = useParams<{ gameId: string }>()
  const [item, setItem] = React.useState<GameWithBuildDTO | null>(null)
  const [reviews, setReviews] = React.useState<GameReviewDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [gameData, reviewData] = await Promise.all([
          getGame(gameId),
          listReviews(gameId, { limit: 50 }),
        ])
        if (!cancelled) {
          setItem(gameData)
          setReviews(reviewData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load game details')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    if (gameId) {
      void run()
    }
    return () => {
      cancelled = true
    }
  }, [gameId])

  const ratingBuckets = React.useMemo(() => {
    const counters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach((review) => {
      const score = review.rating_score
      if (score && score >= 1 && score <= 5) {
        counters[score as 1 | 2 | 3 | 4 | 5] += 1
      }
    })
    return counters
  }, [reviews])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading game details...</div>
  }
  if (error || !item) {
    return <div className="p-6 text-sm text-red-400">{error ?? 'Game not found'}</div>
  }

  const game = item.game
  const screenshots = game.screenshot_urls ?? []

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2">
          <Link to={`/games/${gameId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to details
          </Link>
          <div className="text-sm font-semibold">{game.title}</div>
          <Link
            to={`/games/${game.id}/play`}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Play className="h-3.5 w-3.5" />
            Play now
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950">
            <div className="relative h-64 md:h-80">
              {game.hero_image_url || game.thumbnail_url ? (
                <img
                  src={game.hero_image_url ?? game.thumbnail_url}
                  alt={game.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-blue-700/40 to-cyan-700/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <h1 className="text-2xl font-bold text-white md:text-3xl">{game.title}</h1>
                <p className="mt-2 max-w-3xl text-sm text-zinc-200/90">{game.description ?? 'No description yet.'}</p>
              </div>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {screenshots.length > 0 ? (
                screenshots.slice(0, 6).map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-zinc-700"
                  >
                    <img src={url} alt={`screenshot-${index + 1}`} className="h-28 w-full object-cover transition hover:scale-105" />
                  </a>
                ))
              ) : (
                <div className="col-span-full rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
                  No screenshots uploaded.
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-3">
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <div className="text-sm font-semibold">Game info</div>
              <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <div>Source: {game.source_type}</div>
                <div>Category: {game.category ?? 'unknown'}</div>
                <div>Age rating: {game.age_rating ?? 'not set'}</div>
                <div>Total plays: {formatPlayCount(game.launch_count)}</div>
                <div>Publish state: {game.publish_state}</div>
              </div>
              <Link
                to={`/games/${game.id}/play`}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                <Play className="h-3.5 w-3.5" />
                Play this game
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Ratings</span>
                <span className="text-xs text-muted-foreground">{game.rating_count} reviews</span>
              </div>
              <div className="mt-2 text-3xl font-bold">{game.avg_rating.toFixed(1)}</div>
              <div className="mt-3 space-y-1.5">
                {[5, 4, 3, 2, 1].map((score) => {
                  const count = ratingBuckets[score as 1 | 2 | 3 | 4 | 5]
                  const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
                  return (
                    <div key={score} className="flex items-center gap-2 text-xs">
                      <span className="w-7 text-muted-foreground">{score}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-800">
                        <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-9 text-right text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-4 rounded-xl border border-border bg-card/70 p-4">
          <div className="mb-3 text-sm font-semibold">Community reviews (Steam-like)</div>
          {reviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">No reviews yet.</div>
          ) : (
            <div className="space-y-2">
              {reviews.slice(0, 20).map((review) => (
                <div key={review.id} className="rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">User {review.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-amber-300">{review.rating_score ? `${review.rating_score}/5` : 'No score'}</div>
                  </div>
                  <div className="mt-1 text-sm">{review.content}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export const GamePlayerPage: React.FC = () => {
  type SDKErrorCode =
    | 'ERR_BAD_REQUEST'
    | 'ERR_TIMEOUT'
    | 'ERR_UNAUTHORIZED'
    | 'ERR_CHANNEL_REQUIRED'
    | 'ERR_ROOM_REQUIRED'
    | 'ERR_NOT_READY'
    | 'ERR_UNSUPPORTED_ACTION'
    | 'ERR_INTERNAL'

  type ShareAction = 'shareScore' | 'shareAchievement' | 'shareGame' | 'shareSessionStart'
  type ShareSelection = { serverId: string; channelId: string }

  const { gameId = '' } = useParams<{ gameId: string }>()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const currentUserId = useAuthStore((state) => state.user?.id ?? '')
  const [playUrl, setPlayUrl] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState<string>('Game')
  const [error, setError] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [sdkSessionId, setSdkSessionId] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const playerContainerRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const gameWsRef = React.useRef<GameWsClient | null>(null)
  const sdkTargetOriginRef = React.useRef<string>('*')
  const activeRoomIdRef = React.useRef<string | null>(null)
  const roomStateVersionRef = React.useRef<Map<string, number>>(new Map())
  const sdkSessionIdRef = React.useRef<string | null>(null)
  const sharePickerResolverRef = React.useRef<((selection: ShareSelection | null) => void) | null>(null)
  const [sharePickerIntent, setSharePickerIntent] = React.useState<{ action: ShareAction } | null>(null)
  const [sharePickerBusy, setSharePickerBusy] = React.useState(false)
  const channelIdFromQuery = React.useMemo(() => normalizeOptionalID(new URLSearchParams(location.search).get('channelId')), [location.search])
  const sdkTargetOrigin = React.useMemo(() => {
    if (!playUrl) return '*'
    try {
      return new URL(playUrl, window.location.origin).origin
    } catch {
      return '*'
    }
  }, [playUrl])

  React.useEffect(() => {
    sdkTargetOriginRef.current = sdkTargetOrigin
  }, [sdkTargetOrigin])

  React.useEffect(() => {
    sdkSessionIdRef.current = sdkSessionId
  }, [sdkSessionId])

  const resolveSharePicker = React.useCallback((selection: ShareSelection | null) => {
    const resolver = sharePickerResolverRef.current
    sharePickerResolverRef.current = null
    setSharePickerBusy(false)
    setSharePickerIntent(null)
    resolver?.(selection)
  }, [])

  React.useEffect(() => {
    return () => {
      sharePickerResolverRef.current?.(null)
      sharePickerResolverRef.current = null
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const session = await createPlaySession(gameId)
        if (!cancelled) {
          setPlayUrl(resolvePlayURL(session.play_url))
          setTitle(session.title)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to create play session')
        }
      }
    }
    if (gameId) {
      void run()
    }
    return () => {
      cancelled = true
    }
  }, [gameId])

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  React.useEffect(() => {
    if (!token || !gameId || !playUrl) {
      return
    }
    const wsClient = new GameWsClient(token)
    gameWsRef.current = wsClient
    wsClient.connect()
    const forwardEventToIframe = (event: GameRoomRealtimeEvent) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'GOPORTAL_GAME_EVENT',
          payload: event,
        },
        sdkTargetOriginRef.current,
      )
    }
    const handleRoomEvent = async (event: GameRoomRealtimeEvent) => {
      if (event.game_id !== gameId) {
        return
      }
      if (activeRoomIdRef.current && event.room_id !== activeRoomIdRef.current) {
        return
      }
      const roomID = event.room_id
      const incomingVersion = Number(event.state_version ?? 0)
      if (roomID && incomingVersion > 0) {
        const currentVersion = roomStateVersionRef.current.get(roomID) ?? 0
        if (currentVersion > 0 && incomingVersion > currentVersion + 1) {
          try {
            const latestState = await getGameRoomState(gameId, roomID)
            const latestVersion = Number(latestState.room.state_version ?? incomingVersion)
            roomStateVersionRef.current.set(roomID, latestVersion)
            forwardEventToIframe({
              event_id: `rehydrate-${Date.now()}`,
              event_type: 'GAME_ROOM_STATE_UPDATED',
              occurred_at: new Date().toISOString(),
              game_id: latestState.room.game_id,
              room_id: latestState.room.id,
              actor_user_id: event.actor_user_id,
              member_user_ids: latestState.members.map((item) => item.user_id),
              channel_id: latestState.room.channel_id,
              room_status: latestState.room.status,
              state_version: latestVersion,
              state: latestState.room.current_state,
            })
            return
          } catch {
            // fall through and still dispatch incoming event
          }
        }
        if (incomingVersion < currentVersion) {
          return
        }
        roomStateVersionRef.current.set(roomID, incomingVersion)
      }
      forwardEventToIframe(event)
    }
    const unsubscribe = wsClient.onRoomEvent((event: GameRoomRealtimeEvent) => {
      void handleRoomEvent(event)
    })
    return () => {
      unsubscribe()
      wsClient.disconnect()
      if (gameWsRef.current === wsClient) {
        gameWsRef.current = null
      }
    }
  }, [gameId, playUrl, token])

  const toggleFullscreen = React.useCallback(async () => {
    const node = playerContainerRef.current
    if (!node) {
      return
    }
    try {
      if (!document.fullscreenElement) {
        await node.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // no-op
    }
  }, [])

  const toggleMute = React.useCallback(() => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    // Cooperative games can listen for this event and mute internally.
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'GO_PORTAL_AUDIO_TOGGLE', muted: nextMuted },
      '*',
    )
  }, [isMuted])

  React.useEffect(() => {
    const sendResponse = (params: {
      requestId: string
      ok: boolean
      protocolVersion: string
      targetOrigin: string
      data?: unknown
      error?: string
      errorCode?: SDKErrorCode
      retryable?: boolean
    }) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'GOPORTAL_SDK_RESPONSE',
          protocol_version: params.protocolVersion,
          request_id: params.requestId,
          ok: params.ok,
          data: params.data,
          error: params.error,
          error_code: params.errorCode,
          retryable: params.retryable,
        },
        params.targetOrigin,
      )
    }

    const sendSDKEvent = (payload: Record<string, unknown>, targetOrigin: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'GOPORTAL_GAME_EVENT',
          payload,
        },
        targetOrigin,
      )
    }

    const sendShareStatusEvent = (params: {
      requestId: string
      action: ShareAction
      status: 'opened' | 'submitted' | 'shared' | 'cancelled' | 'failed'
      targetOrigin: string
      sessionId?: string
      eventId?: string
      channelId?: string
      serverId?: string
      error?: string
    }) => {
      sendSDKEvent(
        {
          event_id: `share-status-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          event_type: 'gop.sdk.share_status',
          request_id: params.requestId,
          share_action: params.action,
          status: params.status,
          session_id: params.sessionId,
          game_event_id: params.eventId,
          channel_id: params.channelId,
          server_id: params.serverId,
          error: params.error,
          occurred_at: new Date().toISOString(),
        },
        params.targetOrigin,
      )
    }

    const requestShareSelection = async (action: ShareAction): Promise<ShareSelection | null> => {
      if (sharePickerResolverRef.current) {
        sharePickerResolverRef.current(null)
        sharePickerResolverRef.current = null
      }
      setSharePickerBusy(false)
      setSharePickerIntent({ action })
      return new Promise((resolve) => {
        sharePickerResolverRef.current = resolve
      })
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }
      if (sdkTargetOrigin !== '*' && event.origin !== sdkTargetOrigin) {
        return
      }
      const payload = event.data
      if (!payload || payload.type !== 'GOPORTAL_SDK_REQUEST') {
        return
      }
      const requestId = typeof payload.request_id === 'string' ? payload.request_id : `${Date.now()}`
      const action = typeof payload.action === 'string' ? payload.action : ''
      const body = payload.payload ?? {}
      const protocolVersion = typeof payload.protocol_version === 'string' ? payload.protocol_version : '1.0'
      const responseOrigin = sdkTargetOrigin === '*' ? event.origin || '*' : sdkTargetOrigin

      const fail = (message: string, errorCode: SDKErrorCode, retryable = false) => {
        sendResponse({
          requestId,
          ok: false,
          protocolVersion,
          targetOrigin: responseOrigin,
          error: message,
          errorCode,
          retryable,
        })
      }

      const ensureSession = async (channelId?: string): Promise<string> => {
        const currentSessionId = sdkSessionIdRef.current
        if (currentSessionId) {
          return currentSessionId
        }
        const session = await startGameSession(gameId, { channel_id: channelId, metadata: { source: 'game-sdk' } })
        sdkSessionIdRef.current = session.id
        setSdkSessionId(session.id)
        return session.id
      }

      const run = async () => {
        if (action === 'handshake' || action === 'ready') {
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: {
              protocol_version: '2.0',
              context: {
                game_id: gameId,
                channel_id: channelIdFromQuery ?? undefined,
                user_id: currentUserId || undefined,
              },
              capabilities: {
                share_score: true,
                share_achievement: true,
                share_game: true,
                share_session_start: true,
                rooms: true,
                room_state_sync: true,
              },
            },
          })
          return
        }
        if (action === 'init') {
          const session = await startGameSession(gameId, {
            channel_id: normalizeOptionalID(body.channel_id) ?? channelIdFromQuery,
            room_id: normalizeOptionalID(body.room_id),
            metadata: body.metadata,
          })
          const roomId = normalizeOptionalID(body.room_id)
          if (roomId) {
            activeRoomIdRef.current = roomId
            gameWsRef.current?.subscribeRoom(roomId)
          }
          sdkSessionIdRef.current = session.id
          setSdkSessionId(session.id)
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: { session_id: session.id },
          })
          return
        }
        if (action === 'shareScore' || action === 'shareAchievement' || action === 'shareGame' || action === 'shareSessionStart') {
          const shareAction = action as ShareAction
          const shareEnabled = body.share !== false
          let selection: ShareSelection | null = null
          let targetChannelId = normalizeOptionalID(body.channel_id) ?? channelIdFromQuery

          try {
            if (shareEnabled && !targetChannelId) {
              sendShareStatusEvent({
                requestId,
                action: shareAction,
                status: 'opened',
                targetOrigin: responseOrigin,
              })
              selection = await requestShareSelection(shareAction)
              if (!selection) {
                sendShareStatusEvent({
                  requestId,
                  action: shareAction,
                  status: 'cancelled',
                  targetOrigin: responseOrigin,
                })
                fail('Share cancelled by user', 'ERR_BAD_REQUEST', false)
                return
              }
              targetChannelId = selection.channelId
            }

            if (shareEnabled && targetChannelId) {
              sendShareStatusEvent({
                requestId,
                action: shareAction,
                status: 'submitted',
                targetOrigin: responseOrigin,
                channelId: targetChannelId,
                serverId: selection?.serverId,
              })
            }

            if (shareAction === 'shareScore') {
              const sessionId = await ensureSession(targetChannelId)
              const eventCreated = await createGameEvent(gameId, sessionId, {
                event_type: 'score',
                idempotency_key: body.idempotency_key,
                score: body.score,
                payload: body.payload,
              })
              const shared = Boolean(shareEnabled && targetChannelId)
              if (shared && targetChannelId) {
                await shareGameToChannel(gameId, {
                  channel_id: targetChannelId,
                  session_id: sessionId,
                  event_id: eventCreated.id,
                  share_type: 'score',
                  score: body.score,
                  comment: body.comment,
                })
              }
              if (shared) {
                sendShareStatusEvent({
                  requestId,
                  action: shareAction,
                  status: 'shared',
                  targetOrigin: responseOrigin,
                  sessionId,
                  eventId: eventCreated.id,
                  channelId: targetChannelId,
                  serverId: selection?.serverId,
                })
              }
              sendResponse({
                requestId,
                ok: true,
                protocolVersion: '2.0',
                targetOrigin: responseOrigin,
                data: {
                  event_id: eventCreated.id,
                  session_id: sessionId,
                  share_action: shareAction,
                  shared,
                  share_status: shared ? 'shared' : 'skipped',
                  target: targetChannelId ? { channel_id: targetChannelId, server_id: selection?.serverId } : undefined,
                },
              })
              return
            }

            if (shareAction === 'shareAchievement') {
              const sessionId = await ensureSession(targetChannelId)
              const eventCreated = await createGameEvent(gameId, sessionId, {
                event_type: 'achievement',
                idempotency_key: body.idempotency_key,
                achievement_code: body.achievement_code,
                achievement_title: body.achievement_title,
                payload: body.payload,
              })
              const shared = Boolean(shareEnabled && targetChannelId)
              if (shared && targetChannelId) {
                await shareGameToChannel(gameId, {
                  channel_id: targetChannelId,
                  session_id: sessionId,
                  event_id: eventCreated.id,
                  share_type: 'achievement',
                  achievement: body.achievement_title ?? body.achievement_code,
                  comment: body.comment,
                })
              }
              if (shared) {
                sendShareStatusEvent({
                  requestId,
                  action: shareAction,
                  status: 'shared',
                  targetOrigin: responseOrigin,
                  sessionId,
                  eventId: eventCreated.id,
                  channelId: targetChannelId,
                  serverId: selection?.serverId,
                })
              }
              sendResponse({
                requestId,
                ok: true,
                protocolVersion: '2.0',
                targetOrigin: responseOrigin,
                data: {
                  event_id: eventCreated.id,
                  session_id: sessionId,
                  share_action: shareAction,
                  shared,
                  share_status: shared ? 'shared' : 'skipped',
                  target: targetChannelId ? { channel_id: targetChannelId, server_id: selection?.serverId } : undefined,
                },
              })
              return
            }

            if (shareAction === 'shareGame') {
              const shared = Boolean(shareEnabled && targetChannelId)
              if (shared && targetChannelId) {
                await shareGameToChannel(gameId, {
                  channel_id: targetChannelId,
                  share_type: 'game',
                  comment: body.comment,
                })
                sendShareStatusEvent({
                  requestId,
                  action: shareAction,
                  status: 'shared',
                  targetOrigin: responseOrigin,
                  channelId: targetChannelId,
                  serverId: selection?.serverId,
                })
              }
              sendResponse({
                requestId,
                ok: true,
                protocolVersion: '2.0',
                targetOrigin: responseOrigin,
                data: {
                  share_action: shareAction,
                  shared,
                  share_status: shared ? 'shared' : 'skipped',
                  target: targetChannelId ? { channel_id: targetChannelId, server_id: selection?.serverId } : undefined,
                },
              })
              return
            }

            const sessionId = await ensureSession(targetChannelId)
            const shared = Boolean(shareEnabled && targetChannelId)
            if (shared && targetChannelId) {
              await shareGameToChannel(gameId, {
                channel_id: targetChannelId,
                session_id: sessionId,
                share_type: 'game',
                comment: body.comment,
              })
              sendShareStatusEvent({
                requestId,
                action: shareAction,
                status: 'shared',
                targetOrigin: responseOrigin,
                sessionId,
                channelId: targetChannelId,
                serverId: selection?.serverId,
              })
            }
            sendResponse({
              requestId,
              ok: true,
              protocolVersion: '2.0',
              targetOrigin: responseOrigin,
              data: {
                session_id: sessionId,
                share_action: shareAction,
                shared,
                share_status: shared ? 'shared' : 'skipped',
                target: targetChannelId ? { channel_id: targetChannelId, server_id: selection?.serverId } : undefined,
              },
            })
            return
          } catch (err) {
            sendShareStatusEvent({
              requestId,
              action: shareAction,
              status: 'failed',
              targetOrigin: responseOrigin,
              channelId: targetChannelId,
              serverId: selection?.serverId,
              error: err instanceof Error ? err.message : 'Share failed',
            })
            throw err
          }
        }
        if (action === 'createRoom') {
          const room = await createGameRoom(gameId, {
            channel_id: normalizeOptionalID(body.channel_id) ?? channelIdFromQuery,
            room_name: body.room_name,
            max_players: body.max_players,
          })
          activeRoomIdRef.current = room.room.id
          roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1))
          gameWsRef.current?.subscribeRoom(room.room.id)
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: room,
          })
          return
        }
        if (action === 'joinRoom') {
          if (typeof body.room_id !== 'string' || !body.room_id) {
            fail('room_id is required', 'ERR_ROOM_REQUIRED', false)
            return
          }
          const room = await joinGameRoom(gameId, body.room_id)
          activeRoomIdRef.current = room.room.id
          roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1))
          gameWsRef.current?.subscribeRoom(room.room.id)
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: room,
          })
          return
        }
        if (action === 'leaveRoom') {
          if (typeof body.room_id !== 'string' || !body.room_id) {
            fail('room_id is required', 'ERR_ROOM_REQUIRED', false)
            return
          }
          const room = await leaveGameRoom(gameId, body.room_id)
          if (activeRoomIdRef.current === body.room_id) {
            activeRoomIdRef.current = null
          }
          if (typeof body.room_id === 'string' && body.room_id) {
            roomStateVersionRef.current.delete(body.room_id)
          }
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: room,
          })
          return
        }
        if (action === 'getRoomState') {
          if (typeof body.room_id !== 'string' || !body.room_id) {
            fail('room_id is required', 'ERR_ROOM_REQUIRED', false)
            return
          }
          const room = await getGameRoomState(gameId, body.room_id)
          activeRoomIdRef.current = room.room.id
          roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1))
          gameWsRef.current?.subscribeRoom(room.room.id)
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: room,
          })
          return
        }
        if (action === 'subscribeRoom') {
          const roomID = typeof body.room_id === 'string' ? body.room_id : ''
          if (!roomID) {
            fail('room_id is required', 'ERR_ROOM_REQUIRED', false)
            return
          }
          activeRoomIdRef.current = roomID
          gameWsRef.current?.subscribeRoom(roomID)
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: { subscribed: true, room_id: roomID },
          })
          return
        }
        if (action === 'sendState') {
          if (typeof body.room_id !== 'string' || !body.room_id) {
            fail('room_id is required', 'ERR_ROOM_REQUIRED', false)
            return
          }
          const roomID = body.room_id.trim()
          const stateVersion = Number(body.state_version ?? 0)
          activeRoomIdRef.current = roomID
          gameWsRef.current?.subscribeRoom(roomID)
          const published = gameWsRef.current?.publishState({
            game_id: gameId,
            room_id: roomID,
            state: body.state,
            state_version: stateVersion,
            room_status: 'open',
            channel_id: channelIdFromQuery ?? undefined,
          })
          if (!published) {
            fail('Realtime socket is not connected', 'ERR_INTERNAL', true)
            return
          }
          sendResponse({
            requestId,
            ok: true,
            protocolVersion: '2.0',
            targetOrigin: responseOrigin,
            data: { event_id: `ws-${Date.now()}` },
          })
          return
        }
        fail('Unsupported SDK action', 'ERR_UNSUPPORTED_ACTION', false)
      }
      void run().catch((err) => {
        fail(err instanceof Error ? err.message : 'SDK command failed', 'ERR_INTERNAL', false)
      })
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [channelIdFromQuery, currentUserId, gameId, sdkTargetOrigin])

  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>
  }
  if (!playUrl) {
    return <div className="p-6 text-sm text-muted-foreground">Preparing game...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:px-6">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2">
          <div className="flex items-center gap-2">
            <Link to={`/games/${gameId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <Link to="/games" className="text-xs text-muted-foreground hover:text-foreground">
              Library
            </Link>
          </div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reload
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div ref={playerContainerRef} className="relative overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={playUrl}
            title={title}
            className="h-[calc(100vh-10rem)] w-full bg-background"
            sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-same-origin"
          />
        </div>
      </div>
      <GameSharePickerDialog
        open={Boolean(sharePickerIntent)}
        action={(sharePickerIntent?.action as SharePickerAction | undefined) ?? null}
        loading={sharePickerBusy}
        preferredChannelId={channelIdFromQuery}
        onCancel={() => resolveSharePicker(null)}
        onConfirm={(selection) => {
          setSharePickerBusy(true)
          resolveSharePicker(selection)
        }}
      />
    </div>
  )
}

export const QuickGamesLauncher: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
}> = ({ open, onOpenChange }) => {
  const [items, setItems] = React.useState<GameWithBuildDTO[]>([])
  const [loading, setLoading] = React.useState(false)
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!open) {
      return
    }
    setLoading(true)
    void listTrendingGames({ limit: 12 })
      .then((data) => setItems(data))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Quick Games Launcher
          </DialogTitle>
          <DialogDescription>Pick a trending game to open immediately.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading games...</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {items.map((item) => (
              <button
                key={`quick-${item.game.id}`}
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  void navigate(`/games/${item.game.id}/play`)
                }}
                className="rounded-md border border-border bg-background p-3 text-left transition hover:bg-accent"
              >
                <div className="text-sm font-medium">{item.game.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.game.source_type} • {item.game.avg_rating.toFixed(1)} stars
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
