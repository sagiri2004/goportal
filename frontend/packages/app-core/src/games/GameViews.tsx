import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Tabs, TabsList, TabsTrigger } from '@goportal/ui'
import { Gamepad2, Search, Star, TrendingUp } from 'lucide-react'
import {
  createGame,
  createReview,
  createPlaySession,
  listMyGames,
  listReviews,
  listTrendingGames,
  listGames,
  rateGame,
  reportGame,
  searchGames,
  submitGameForReview,
  uploadGameBuild,
  type GameWithBuildDTO,
  type GameReviewDTO,
} from '../services'

const resolvePlayURL = (rawURL: string): string => {
  if (/^https?:\/\//i.test(rawURL)) {
    return rawURL
  }

  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const baseURL = viteEnv?.VITE_API_URL ?? 'http://localhost:8080'
  return new URL(rawURL, baseURL).toString()
}

export const GamesCatalogPage: React.FC = () => {
  const navigate = useNavigate()
  const [items, setItems] = React.useState<GameWithBuildDTO[]>([])
  const [featured, setFeatured] = React.useState<GameWithBuildDTO[]>([])
  const [myGames, setMyGames] = React.useState<GameWithBuildDTO[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [activeSourceType, setActiveSourceType] = React.useState<'system' | 'community'>('system')
  const [sortMode, setSortMode] = React.useState<'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured'>('trending')
  const [searchKeyword, setSearchKeyword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [submitReviewState, setSubmitReviewState] = React.useState<Record<string, boolean>>({})
  const [title, setTitle] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [tags, setTags] = React.useState('')
  const [ageRating, setAgeRating] = React.useState('')
  const [version, setVersion] = React.useState('v1.0.0')
  const [bundle, setBundle] = React.useState<File | null>(null)

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

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading games...</div>
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>
  }

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

    setIsSubmitting(true)
    setUploadError(null)
    try {
      const game = await createGame({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
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
      await navigate(`/app/games/${game.id}/play`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload game.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Game Library</h2>
      <p className="mt-1 text-sm text-muted-foreground">Browse System and Community games with social discovery.</p>
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <Tabs value={activeSourceType} onValueChange={(value) => setActiveSourceType(value as 'system' | 'community')}>
          <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <form onSubmit={onSearch} className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder={`Search ${activeSourceType} games`}
              className="w-full rounded-md border border-border bg-background px-9 py-2 text-sm"
            />
          </form>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as 'trending' | 'top_rated' | 'newest' | 'most_played' | 'featured')
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="trending">Trending</option>
            <option value="top_rated">Top rated</option>
            <option value="newest">Newest</option>
            <option value="most_played">Most played</option>
            <option value="featured">Featured</option>
          </select>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          Featured and trending
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((item) => (
            <Link
              key={`featured-${item.game.id}`}
              to={`/app/games/${item.game.id}/play`}
              className="rounded-md border border-border bg-background p-3 transition hover:bg-accent"
            >
              <div className="text-xs text-muted-foreground">{item.game.source_type}</div>
              <div className="mt-1 text-sm font-medium">{item.game.title}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-amber-400" />
                {item.game.avg_rating.toFixed(1)} ({item.game.rating_count})
              </div>
            </Link>
          ))}
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-medium">Creator studio: publish new community game</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Game title"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="game-slug"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1.0.0"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g puzzle, shooter)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={ageRating}
            onChange={(e) => setAgeRating(e.target.value)}
            placeholder="Age rating (e.g everyone)"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={(e) => setBundle(e.target.files?.[0] ?? null)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="mt-3 min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {uploadError ? <div className="mt-2 text-sm text-red-500">{uploadError}</div> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? 'Uploading...' : 'Create & Upload'}
        </button>
      </form>
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 text-sm font-medium">My games</div>
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
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.game.id}
            to={`/app/games/${item.game.id}/play`}
            className="rounded-lg border border-border bg-card p-4 transition hover:bg-accent"
          >
            <div className="text-sm text-muted-foreground">
              {item.game.source_type} • {item.build?.version ?? 'No build'}
            </div>
            <div className="mt-1 text-base font-medium">{item.game.title}</div>
            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {item.game.description ?? 'No description'}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-400" />
              {item.game.avg_rating.toFixed(1)} ({item.game.rating_count}) • {item.game.launch_count} plays
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const GamePlayerPage: React.FC = () => {
  const { gameId = '' } = useParams<{ gameId: string }>()
  const [playUrl, setPlayUrl] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState<string>('Game')
  const [error, setError] = React.useState<string | null>(null)
  const [reviews, setReviews] = React.useState<GameReviewDTO[]>([])
  const [reviewText, setReviewText] = React.useState('')
  const [reviewScore, setReviewScore] = React.useState(5)

  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [session, gameReviews] = await Promise.all([
          createPlaySession(gameId),
          listReviews(gameId, { limit: 10 }),
        ])
        if (!cancelled) {
          setPlayUrl(resolvePlayURL(session.play_url))
          setTitle(session.title)
          setReviews(gameReviews)
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

  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>
  }
  if (!playUrl) {
    return <div className="p-6 text-sm text-muted-foreground">Preparing game...</div>
  }

  return (
    <div className="h-full w-full p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <iframe
        src={playUrl}
        title={title}
        className="h-[calc(100vh-10rem)] w-full rounded-md border border-border bg-background"
        sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-same-origin"
      />
      <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 text-sm font-medium">Community reviews</div>
          <div className="space-y-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded border border-border bg-background p-2">
                <div className="text-xs text-muted-foreground">
                  {review.rating_score ? `${review.rating_score}/5` : 'No score'}
                </div>
                <div className="text-sm">{review.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <div className="text-sm font-medium">Rate and report</div>
          <div className="mt-2">
            <label className="mb-1 block text-xs text-muted-foreground">Your rating</label>
            <input
              type="number"
              min={1}
              max={5}
              value={reviewScore}
              onChange={(event) => setReviewScore(Number(event.target.value))}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </div>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Share your review..."
            className="mt-2 min-h-24 w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await rateGame(gameId, reviewScore)
                await createReview(gameId, { content: reviewText.trim(), score: reviewScore })
                const refreshed = await listReviews(gameId, { limit: 10 })
                setReviews(refreshed)
                setReviewText('')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to send review')
              }
            }}
            className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Submit review
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await reportGame(gameId, { reason: 'inappropriate_content', detail: 'Reported by user from player page' })
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to report game')
              }
            }}
            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
          >
            Report this game
          </button>
        </div>
      </div>
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
                  void navigate(`/app/games/${item.game.id}/play`)
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
