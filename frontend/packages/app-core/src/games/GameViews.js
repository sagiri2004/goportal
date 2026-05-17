import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Tabs, TabsList, TabsTrigger } from '@goportal/ui';
import { ArrowLeft, Flame, Gamepad2, Library, Maximize2, Minimize2, Play, RefreshCcw, Search, Sparkles, Star, Store, TrendingUp, UploadCloud, Volume2, VolumeX } from 'lucide-react';
import { createGame, getGame, createPlaySession, createGameEvent, createGameRoom, listMyGames, listReviews, listTrendingGames, listGames, leaveGameRoom, searchGames, shareGameToChannel, startGameSession, submitGameForReview, joinGameRoom, getGameRoomState, listOpenGameRooms, uploadMedia, uploadGameBuild, GameWsClient, } from '../services';
import { useAuthStore } from '@goportal/store';
import { GameSharePickerDialog } from './GameSharePickerDialog';
const resolvePlayURL = (rawURL) => {
    if (/^https?:\/\//i.test(rawURL)) {
        return rawURL;
    }
    const viteEnv = import.meta.env;
    const baseURL = viteEnv?.VITE_API_URL ?? 'http://localhost:8080';
    return new URL(rawURL, baseURL).toString();
};
const fallbackCardGradients = [
    'from-indigo-500/30 to-cyan-500/20',
    'from-fuchsia-500/30 to-violet-500/20',
    'from-emerald-500/30 to-lime-500/20',
    'from-orange-500/30 to-rose-500/20',
];
const formatPlayCount = (count) => {
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1)}K`;
    }
    return `${count}`;
};
const normalizeOptionalID = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    return normalized ? normalized : undefined;
};
const GameTile = ({ item, index }) => {
    const detailHref = `/games/${item.game.id}`;
    const playHref = `/games/${item.game.id}/play`;
    return (_jsxs("div", { className: "group w-full overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/85 transition hover:-translate-y-1 hover:border-zinc-500", children: [_jsxs("div", { className: `relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${fallbackCardGradients[index % fallbackCardGradients.length]}`, children: [_jsx(Link, { to: detailHref, className: "block h-full w-full", children: item.game.thumbnail_url ? (_jsx("img", { src: item.game.thumbnail_url, alt: item.game.title, className: "h-full w-full object-cover transition duration-300 group-hover:scale-105" })) : (_jsx("div", { className: "flex h-full items-center justify-center text-xs font-medium text-foreground/80", children: item.game.category || 'Featured game' })) }), _jsx("div", { className: "absolute left-2 top-2 rounded-full border border-border/60 bg-black/35 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/90", children: item.game.source_type }), _jsx("div", { className: "pointer-events-none absolute inset-0 bg-black/65 opacity-0 transition group-hover:opacity-100" }), _jsxs("div", { className: "absolute inset-x-2 bottom-2 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100", children: [_jsxs(Link, { to: playHref, className: "inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground", children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Play"] }), _jsx(Link, { to: detailHref, className: "inline-flex flex-1 items-center justify-center rounded-md border border-zinc-500 bg-black/60 px-2 py-1 text-[11px] font-medium text-zinc-100", children: "Details" })] })] }), _jsxs("div", { className: "space-y-1 p-2.5", children: [_jsx(Link, { to: detailHref, className: "line-clamp-1 text-xs font-semibold text-zinc-100 hover:underline", children: item.game.title }), _jsxs("div", { className: "flex items-center justify-between text-[10px] text-zinc-400", children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Star, { className: "h-2.5 w-2.5 text-amber-400" }), item.game.avg_rating.toFixed(1)] }), _jsxs("span", { children: [formatPlayCount(item.game.launch_count), " plays"] })] })] })] }));
};
export const GamesCatalogPage = () => {
    const [items, setItems] = React.useState([]);
    const [featured, setFeatured] = React.useState([]);
    const [myGames, setMyGames] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeSourceType, setActiveSourceType] = React.useState('system');
    const [sortMode, setSortMode] = React.useState('trending');
    const [searchKeyword, setSearchKeyword] = React.useState('');
    React.useEffect(() => {
        let cancelled = false;
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
                ]);
                if (!cancelled) {
                    setItems(market);
                    setFeatured(trending);
                    setMyGames(mine);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to load games');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [activeSourceType, sortMode]);
    const onSearch = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
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
                });
            setItems(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to search games');
        }
        finally {
            setLoading(false);
        }
    };
    const topGames = React.useMemo(() => items.slice(0, 12), [items]);
    const communityPick = React.useMemo(() => items.filter((item) => item.game.source_type === 'community').slice(0, 6), [items]);
    const heroGame = featured[0] ?? topGames[0];
    const rankedTrending = React.useMemo(() => featured.slice(0, 8), [featured]);
    return (_jsx("div", { className: "min-h-screen bg-[hsl(224,18%,9%)]", children: _jsx("div", { className: "w-full px-0", children: _jsx("div", { className: "overflow-hidden border-y border-zinc-700/70 bg-[hsl(224,16%,11%)] shadow-2xl", children: _jsxs("div", { className: "grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]", children: [_jsxs("aside", { className: "border-r border-zinc-800/80 bg-[hsl(224,18%,10%)] p-4", children: [_jsxs("div", { className: "mb-5 flex items-center gap-2 px-1 py-1", children: [_jsx("div", { className: "rounded-lg bg-blue-500/20 p-1.5", children: _jsx(Gamepad2, { className: "h-4 w-4 text-blue-300" }) }), _jsx("span", { className: "text-sm font-semibold text-zinc-100", children: "GoPortal" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex w-full items-center gap-2 rounded-lg bg-blue-500/20 px-2.5 py-2 text-left text-sm text-blue-200", children: [_jsx(Store, { className: "h-4 w-4" }), "Store"] }), _jsxs(Link, { to: "/games/developer", className: "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100", children: [_jsx(UploadCloud, { className: "h-4 w-4" }), "Developer Console"] })] }), _jsxs("div", { className: "mt-5 border-t border-zinc-800/80 pt-4", children: [_jsx("div", { className: "px-1 text-[11px] uppercase tracking-wide text-zinc-500", children: "Your games" }), _jsx("div", { className: "mt-2 space-y-1", children: (myGames.slice(0, 4).length > 0 ? myGames.slice(0, 4) : topGames.slice(0, 4)).map((item) => (_jsxs(Link, { to: `/games/${item.game.id}/play`, className: "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100", children: [_jsx("div", { className: "h-8 w-8 overflow-hidden rounded bg-zinc-800", children: item.game.icon_url || item.game.thumbnail_url ? (_jsx("img", { src: item.game.icon_url ?? item.game.thumbnail_url, alt: item.game.title, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center text-[10px] text-zinc-400", children: item.game.title.slice(0, 1) })) }), _jsx("span", { className: "line-clamp-1", children: item.game.title })] }, `installed-${item.game.id}`))) })] }), _jsx("div", { className: "mt-auto pt-6", children: _jsxs(Link, { to: "/app", className: "flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800/70", children: [_jsx(Library, { className: "h-4 w-4" }), "Back to app"] }) })] }), _jsxs("main", { className: "p-5 md:p-6", children: [_jsx("div", { className: "mb-4 flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-zinc-100", children: "Game Library" }), _jsx("p", { className: "text-xs text-zinc-400", children: "Discover and play games in GoPortal ecosystem." })] }) }), _jsx("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: _jsx(Tabs, { value: activeSourceType, onValueChange: (value) => setActiveSourceType(value), children: _jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "system", children: "System" }), _jsx(TabsTrigger, { value: "community", children: "Community" })] }) }) }), _jsxs("div", { className: "mb-4 grid gap-2 md:grid-cols-[1fr_auto]", children: [_jsxs("form", { onSubmit: onSearch, className: "relative", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" }), _jsx("input", { value: searchKeyword, onChange: (event) => setSearchKeyword(event.target.value), placeholder: `Search ${activeSourceType} games`, className: "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-9 py-2 text-sm text-zinc-100 placeholder:text-zinc-500" })] }), _jsxs("select", { value: sortMode, onChange: (event) => setSortMode(event.target.value), className: "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200", children: [_jsx("option", { value: "trending", children: "Trending" }), _jsx("option", { value: "top_rated", children: "Top rated" }), _jsx("option", { value: "newest", children: "Newest" }), _jsx("option", { value: "most_played", children: "Most played" }), _jsx("option", { value: "featured", children: "Featured" })] })] }), loading ? (_jsx("div", { className: "rounded-xl border border-zinc-700 bg-zinc-900/80 p-6 text-sm text-zinc-400", children: "Loading games..." })) : null, error ? (_jsx("div", { className: "rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300", children: error })) : null, !loading && !error ? (_jsxs(_Fragment, { children: [heroGame ? (_jsxs("section", { className: "mb-4 grid gap-3 xl:grid-cols-[2fr_1fr]", children: [_jsxs(Link, { to: `/games/${heroGame.game.id}/play`, className: "group relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950", children: [_jsx("div", { className: "absolute inset-0", children: heroGame.game.hero_image_url || heroGame.game.thumbnail_url ? (_jsx("img", { src: heroGame.game.hero_image_url ?? heroGame.game.thumbnail_url, alt: heroGame.game.title, className: "h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" })) : (_jsx("div", { className: "h-full w-full bg-gradient-to-r from-blue-700/40 to-cyan-700/30" })) }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" }), _jsxs("div", { className: "relative z-10 p-5 md:p-6", children: [_jsxs("div", { className: "inline-flex items-center gap-1 rounded-full border border-zinc-500/80 bg-black/50 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-100", children: [_jsx(Flame, { className: "h-3 w-3 text-orange-400" }), "Top pick"] }), _jsx("h2", { className: "mt-2 text-2xl font-bold text-white", children: heroGame.game.title }), _jsx("p", { className: "mt-1.5 line-clamp-2 max-w-2xl text-sm text-zinc-200/90", children: heroGame.game.description ?? 'Jump in and start playing now.' }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-200", children: [_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-1", children: [_jsx(Star, { className: "h-3.5 w-3.5 text-amber-400" }), heroGame.game.avg_rating.toFixed(1), " (", heroGame.game.rating_count, ")"] }), _jsxs("span", { className: "rounded-md bg-black/45 px-2 py-1", children: [formatPlayCount(heroGame.game.launch_count), " plays"] })] })] })] }), _jsxs("div", { className: "rounded-xl border border-zinc-700 bg-zinc-900/80 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100", children: [_jsx(TrendingUp, { className: "h-4 w-4 text-indigo-400" }), "Trending now"] }), _jsx("div", { className: "space-y-2", children: rankedTrending.map((item, index) => (_jsxs(Link, { to: `/games/${item.game.id}/play`, className: "flex items-center gap-3 rounded-lg border border-zinc-700/60 bg-zinc-950/80 px-2.5 py-2 hover:border-zinc-500", children: [_jsx("span", { className: "w-4 text-center text-xs font-semibold text-zinc-300", children: index + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "line-clamp-1 text-sm text-zinc-100", children: item.game.title }), _jsxs("div", { className: "text-[11px] text-zinc-400", children: [formatPlayCount(item.game.launch_count), " plays"] })] }), _jsx("span", { className: "text-[11px] text-amber-300", children: item.game.avg_rating.toFixed(1) })] }, `rank-${item.game.id}`))) })] })] })) : null, _jsxs("section", { className: "mb-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100", children: [_jsx(Sparkles, { className: "h-4 w-4 text-amber-400" }), "Based on your library"] }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6", children: topGames.map((item, index) => (_jsx(GameTile, { item: item, index: index }, `based-${item.game.id}`))) })] }), _jsxs("section", { children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100", children: [_jsx(Store, { className: "h-4 w-4 text-emerald-400" }), "Community picks"] }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6", children: communityPick.map((item, index) => (_jsx(GameTile, { item: item, index: index }, `community-${item.game.id}`))) })] })] })) : null] })] }) }) }) }));
};
export const GamesDeveloperPage = () => {
    const navigate = useNavigate();
    const [myGames, setMyGames] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadError, setUploadError] = React.useState(null);
    const [submitReviewState, setSubmitReviewState] = React.useState({});
    const [title, setTitle] = React.useState('');
    const [slug, setSlug] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [tags, setTags] = React.useState('');
    const [ageRating, setAgeRating] = React.useState('');
    const [trailerURL, setTrailerURL] = React.useState('');
    const [version, setVersion] = React.useState('v1.0.0');
    const [bundle, setBundle] = React.useState(null);
    const [iconFile, setIconFile] = React.useState(null);
    const [capsuleFile, setCapsuleFile] = React.useState(null);
    const [heroFile, setHeroFile] = React.useState(null);
    const [screenshotFiles, setScreenshotFiles] = React.useState([]);
    const [developerTab, setDeveloperTab] = React.useState('publish');
    const [allowScoreShare, setAllowScoreShare] = React.useState(true);
    const [allowAchievementShare, setAllowAchievementShare] = React.useState(true);
    const [allowMultiplayer, setAllowMultiplayer] = React.useState(true);
    const [maxPlayers, setMaxPlayers] = React.useState(8);
    const sdkSnippet = React.useMemo(() => `window.parent.postMessage({
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
}, '*')`, [allowAchievementShare, allowMultiplayer, allowScoreShare, maxPlayers]);
    const refreshMyGames = React.useCallback(async () => {
        const mine = await listMyGames();
        setMyGames(mine);
    }, []);
    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const mine = await listMyGames();
                if (!cancelled) {
                    setMyGames(mine);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to load your games');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, []);
    const onSubmit = async (event) => {
        event.preventDefault();
        if (!bundle) {
            setUploadError('Please choose a .zip game bundle first.');
            return;
        }
        if (!title.trim() || !slug.trim()) {
            setUploadError('Title and slug are required.');
            return;
        }
        if (!iconFile || !capsuleFile || !heroFile || screenshotFiles.length === 0) {
            setUploadError('Steam-like assets required: icon, capsule, hero image, and at least 1 screenshot.');
            return;
        }
        if (screenshotFiles.length > 8) {
            setUploadError('Maximum 8 screenshots.');
            return;
        }
        setIsSubmitting(true);
        setUploadError(null);
        try {
            const [iconUploaded, capsuleUploaded, heroUploaded] = await Promise.all([
                uploadMedia(iconFile, 'game_asset'),
                uploadMedia(capsuleFile, 'game_asset'),
                uploadMedia(heroFile, 'game_asset'),
            ]);
            const screenshotUploads = await Promise.all(screenshotFiles.map((file) => uploadMedia(file, 'game_asset')));
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
            });
            await uploadGameBuild(game.id, bundle, version.trim() || undefined);
            await submitGameForReview(game.id);
            await refreshMyGames();
            navigate(`/games/${game.id}/play`);
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Unable to upload game.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-[radial-gradient(circle_at_top,hsl(240,25%,16%),hsl(240,18%,8%))]", children: _jsxs("div", { className: "mx-auto w-full max-w-6xl px-6 py-6 md:px-8", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "Developer Console" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Publish and manage your community games." })] }), _jsxs(Link, { to: "/games", className: "inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm hover:bg-accent", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back to Library"] })] }), _jsxs("div", { className: "mt-5 rounded-2xl border border-border bg-card/80 p-4 md:p-5", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between gap-2", children: [_jsx("div", { className: "text-sm font-semibold", children: "Developer tools" }), _jsx(Tabs, { value: developerTab, onValueChange: (value) => setDeveloperTab(value), children: _jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "publish", children: "Publish" }), _jsx(TabsTrigger, { value: "integration", children: "Integration" })] }) })] }), developerTab === 'publish' ? (_jsxs("form", { onSubmit: onSubmit, children: [_jsx("div", { className: "mb-3 text-sm font-semibold", children: "Publish new game build" }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "Game title", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: slug, onChange: (e) => setSlug(e.target.value), placeholder: "game-slug", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: version, onChange: (e) => setVersion(e.target.value), placeholder: "v1.0.0", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: category, onChange: (e) => setCategory(e.target.value), placeholder: "Category (e.g puzzle, shooter)", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: tags, onChange: (e) => setTags(e.target.value), placeholder: "Tags (comma separated)", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: ageRating, onChange: (e) => setAgeRating(e.target.value), placeholder: "Age rating (e.g everyone)", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsx("input", { value: trailerURL, onChange: (e) => setTrailerURL(e.target.value), placeholder: "Trailer URL (optional)", className: "rounded-lg border border-border bg-background px-3 py-2 text-sm" }), _jsxs("label", { className: "rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground", children: ["Game icon (required)", _jsx("input", { type: "file", accept: "image/*", onChange: (e) => setIconFile(e.target.files?.[0] ?? null), className: "mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground" })] }), _jsxs("label", { className: "rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground", children: ["Capsule image (required)", _jsx("input", { type: "file", accept: "image/*", onChange: (e) => setCapsuleFile(e.target.files?.[0] ?? null), className: "mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground" })] }), _jsxs("label", { className: "rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground", children: ["Hero image (required)", _jsx("input", { type: "file", accept: "image/*", onChange: (e) => setHeroFile(e.target.files?.[0] ?? null), className: "mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground" })] }), _jsxs("label", { className: "rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground", children: ["Screenshots (required, max 8)", _jsx("input", { type: "file", accept: "image/*", multiple: true, onChange: (e) => setScreenshotFiles(Array.from(e.target.files ?? [])), className: "mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-primary-foreground" })] }), _jsx("input", { type: "file", accept: ".zip,application/zip,application/x-zip-compressed", onChange: (e) => setBundle(e.target.files?.[0] ?? null), className: "rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground" })] }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground", children: [_jsxs("span", { children: ["Icon: ", iconFile?.name ?? 'missing'] }), _jsxs("span", { children: ["Capsule: ", capsuleFile?.name ?? 'missing'] }), _jsxs("span", { children: ["Hero: ", heroFile?.name ?? 'missing'] }), _jsxs("span", { children: ["Screenshots: ", screenshotFiles.length] })] }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Description (optional)", className: "mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" }), uploadError ? _jsx("div", { className: "mt-2 text-sm text-red-400", children: uploadError }) : null, _jsx("button", { type: "submit", disabled: isSubmitting, className: "mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60", children: isSubmitting ? 'Uploading...' : 'Create & Upload' })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm text-muted-foreground", children: "Configure game social integration flags for your HTML game runtime." }), _jsxs("div", { className: "rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground", children: ["SDK source: ", _jsx("code", { children: "game-sdk/browser/goportal-game-sdk.js" }), " | Docs: ", _jsx("code", { children: "game-sdk/README.md" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Link, { to: "/games/sdk/docs", className: "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent", children: "Open Frontend SDK Docs (EN/VI)" }), _jsx("span", { className: "text-xs text-muted-foreground", children: "Professional guide with full examples for HTML + React/Vite" })] }), _jsxs("label", { className: "flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm", children: ["Allow score share", _jsx("input", { type: "checkbox", checked: allowScoreShare, onChange: (e) => setAllowScoreShare(e.target.checked) })] }), _jsxs("label", { className: "flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm", children: ["Allow achievement share", _jsx("input", { type: "checkbox", checked: allowAchievementShare, onChange: (e) => setAllowAchievementShare(e.target.checked) })] }), _jsxs("label", { className: "flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm", children: ["Allow multiplayer rooms", _jsx("input", { type: "checkbox", checked: allowMultiplayer, onChange: (e) => setAllowMultiplayer(e.target.checked) })] }), _jsxs("label", { className: "block rounded-lg border border-border bg-background/70 px-3 py-2 text-sm", children: ["Max players (2-8)", _jsx("input", { type: "number", min: 2, max: 8, value: maxPlayers, onChange: (e) => setMaxPlayers(Number(e.target.value) || 8), className: "mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground", children: "SDK init snippet" }), _jsx("textarea", { readOnly: true, value: sdkSnippet, className: "min-h-40 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" })] })] }))] }), _jsxs("div", { className: "mt-4 rounded-2xl border border-border bg-card/80 p-4 md:p-5", children: [_jsx("div", { className: "mb-2 text-sm font-semibold", children: "My games" }), loading ? _jsx("div", { className: "text-sm text-muted-foreground", children: "Loading your games..." }) : null, error ? _jsx("div", { className: "text-sm text-red-400", children: error }) : null, _jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: myGames.map((item) => (_jsxs("div", { className: "rounded-md border border-border bg-background p-3", children: [_jsx("div", { className: "text-sm font-medium", children: item.game.title }), _jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: ["state: ", item.game.publish_state, " | latest build: ", item.build?.version ?? 'none'] }), _jsx("button", { type: "button", disabled: submitReviewState[item.game.id], onClick: async () => {
                                            setSubmitReviewState((prev) => ({ ...prev, [item.game.id]: true }));
                                            try {
                                                await submitGameForReview(item.game.id);
                                                await refreshMyGames();
                                            }
                                            catch (err) {
                                                setError(err instanceof Error ? err.message : 'Unable to submit for review');
                                            }
                                            finally {
                                                setSubmitReviewState((prev) => ({ ...prev, [item.game.id]: false }));
                                            }
                                        }, className: "mt-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60", children: submitReviewState[item.game.id] ? 'Submitting...' : 'Submit for admin review' })] }, `mine-${item.game.id}`))) })] })] }) }));
};
export const GameDetailPage = () => {
    const { gameId = '' } = useParams();
    const [item, setItem] = React.useState(null);
    const [reviews, setReviews] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const [gameData, reviewData] = await Promise.all([
                    getGame(gameId),
                    listReviews(gameId, { limit: 50 }),
                ]);
                if (!cancelled) {
                    setItem(gameData);
                    setReviews(reviewData);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to load game details');
                }
            }
            finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        if (gameId) {
            void run();
        }
        return () => {
            cancelled = true;
        };
    }, [gameId]);
    const ratingBuckets = React.useMemo(() => {
        const counters = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((review) => {
            const score = review.rating_score;
            if (score && score >= 1 && score <= 5) {
                counters[score] += 1;
            }
        });
        return counters;
    }, [reviews]);
    if (loading) {
        return _jsx("div", { className: "p-6 text-sm text-muted-foreground", children: "Loading game details..." });
    }
    if (error || !item) {
        return _jsx("div", { className: "p-6 text-sm text-red-400", children: error ?? 'Game not found' });
    }
    const game = item.game;
    const screenshots = game.screenshot_urls ?? [];
    return (_jsx("div", { className: "min-h-screen bg-background", children: _jsxs("div", { className: "mx-auto w-full max-w-7xl px-4 py-4 md:px-6", children: [_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2", children: [_jsxs(Link, { to: `/games/${gameId}`, className: "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back to details"] }), _jsx("div", { className: "text-sm font-semibold", children: game.title }), _jsxs(Link, { to: `/games/${game.id}/play`, className: "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground", children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Play now"] })] }), _jsxs("div", { className: "mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]", children: [_jsxs("section", { className: "overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950", children: [_jsxs("div", { className: "relative h-64 md:h-80", children: [game.hero_image_url || game.thumbnail_url ? (_jsx("img", { src: game.hero_image_url ?? game.thumbnail_url, alt: game.title, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "h-full w-full bg-gradient-to-r from-blue-700/40 to-cyan-700/30" })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" }), _jsxs("div", { className: "absolute bottom-0 left-0 p-5", children: [_jsx("h1", { className: "text-2xl font-bold text-white md:text-3xl", children: game.title }), _jsx("p", { className: "mt-2 max-w-3xl text-sm text-zinc-200/90", children: game.description ?? 'No description yet.' })] })] }), _jsx("div", { className: "grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3", children: screenshots.length > 0 ? (screenshots.slice(0, 6).map((url, index) => (_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "overflow-hidden rounded-lg border border-zinc-700", children: _jsx("img", { src: url, alt: `screenshot-${index + 1}`, className: "h-28 w-full object-cover transition hover:scale-105" }) }, `${url}-${index}`)))) : (_jsx("div", { className: "col-span-full rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300", children: "No screenshots uploaded." })) })] }), _jsxs("aside", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-xl border border-border bg-card/70 p-4", children: [_jsx("div", { className: "text-sm font-semibold", children: "Game info" }), _jsxs("div", { className: "mt-2 space-y-1.5 text-xs text-muted-foreground", children: [_jsxs("div", { children: ["Source: ", game.source_type] }), _jsxs("div", { children: ["Category: ", game.category ?? 'unknown'] }), _jsxs("div", { children: ["Age rating: ", game.age_rating ?? 'not set'] }), _jsxs("div", { children: ["Total plays: ", formatPlayCount(game.launch_count)] }), _jsxs("div", { children: ["Publish state: ", game.publish_state] })] }), _jsxs(Link, { to: `/games/${game.id}/play`, className: "mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground", children: [_jsx(Play, { className: "h-3.5 w-3.5" }), "Play this game"] })] }), _jsxs("div", { className: "rounded-xl border border-border bg-card/70 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-semibold", children: "Ratings" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [game.rating_count, " reviews"] })] }), _jsx("div", { className: "mt-2 text-3xl font-bold", children: game.avg_rating.toFixed(1) }), _jsx("div", { className: "mt-3 space-y-1.5", children: [5, 4, 3, 2, 1].map((score) => {
                                                const count = ratingBuckets[score];
                                                const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                                                return (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsxs("span", { className: "w-7 text-muted-foreground", children: [score, "\u2605"] }), _jsx("div", { className: "h-2 flex-1 overflow-hidden rounded bg-zinc-800", children: _jsx("div", { className: "h-full bg-indigo-500", style: { width: `${percent}%` } }) }), _jsx("span", { className: "w-9 text-right text-muted-foreground", children: count })] }, score));
                                            }) })] })] })] }), _jsxs("section", { className: "mt-4 rounded-xl border border-border bg-card/70 p-4", children: [_jsx("div", { className: "mb-3 text-sm font-semibold", children: "Community reviews (Steam-like)" }), reviews.length === 0 ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "No reviews yet." })) : (_jsx("div", { className: "space-y-2", children: reviews.slice(0, 20).map((review) => (_jsxs("div", { className: "rounded-lg border border-border bg-background/70 p-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-xs text-muted-foreground", children: ["User ", review.user_id.slice(0, 8)] }), _jsx("div", { className: "text-xs text-amber-300", children: review.rating_score ? `${review.rating_score}/5` : 'No score' })] }), _jsx("div", { className: "mt-1 text-sm", children: review.content })] }, review.id))) }))] })] }) }));
};
export const GamePlayerPage = () => {
    const { gameId = '' } = useParams();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);
    const currentUserId = useAuthStore((state) => state.user?.id ?? '');
    const [playUrl, setPlayUrl] = React.useState(null);
    const [title, setTitle] = React.useState('Game');
    const [error, setError] = React.useState(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [isMuted, setIsMuted] = React.useState(false);
    const [sdkSessionId, setSdkSessionId] = React.useState(null);
    const [reloadKey, setReloadKey] = React.useState(0);
    const playerContainerRef = React.useRef(null);
    const iframeRef = React.useRef(null);
    const gameWsRef = React.useRef(null);
    const sdkTargetOriginRef = React.useRef('*');
    const activeRoomIdRef = React.useRef(null);
    const roomStateVersionRef = React.useRef(new Map());
    const roomInviteParamsRef = React.useRef(new Map());
    const sdkSessionIdRef = React.useRef(null);
    const sharePickerResolverRef = React.useRef(null);
    const [sharePickerIntent, setSharePickerIntent] = React.useState(null);
    const [sharePickerBusy, setSharePickerBusy] = React.useState(false);
    const channelIdFromQuery = React.useMemo(() => normalizeOptionalID(new URLSearchParams(location.search).get('channelId')), [location.search]);
    const roomIdFromQuery = React.useMemo(() => normalizeOptionalID(new URLSearchParams(location.search).get('roomId')), [location.search]);
    const sdkTargetOrigin = React.useMemo(() => {
        if (!playUrl)
            return '*';
        try {
            return new URL(playUrl, window.location.origin).origin;
        }
        catch {
            return '*';
        }
    }, [playUrl]);
    React.useEffect(() => {
        sdkTargetOriginRef.current = sdkTargetOrigin;
    }, [sdkTargetOrigin]);
    React.useEffect(() => {
        sdkSessionIdRef.current = sdkSessionId;
    }, [sdkSessionId]);
    const resolveSharePicker = React.useCallback((selection) => {
        const resolver = sharePickerResolverRef.current;
        sharePickerResolverRef.current = null;
        setSharePickerBusy(false);
        setSharePickerIntent(null);
        resolver?.(selection);
    }, []);
    React.useEffect(() => {
        return () => {
            sharePickerResolverRef.current?.(null);
            sharePickerResolverRef.current = null;
        };
    }, []);
    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const session = await createPlaySession(gameId);
                if (!cancelled) {
                    setPlayUrl(resolvePlayURL(session.play_url));
                    setTitle(session.title);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to create play session');
                }
            }
        };
        if (gameId) {
            void run();
        }
        return () => {
            cancelled = true;
        };
    }, [gameId]);
    React.useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);
    React.useEffect(() => {
        if (!token || !gameId || !playUrl) {
            return;
        }
        const wsClient = new GameWsClient(token);
        gameWsRef.current = wsClient;
        wsClient.connect();
        const forwardEventToIframe = (event) => {
            iframeRef.current?.contentWindow?.postMessage({
                type: 'GOPORTAL_GAME_EVENT',
                payload: event,
            }, sdkTargetOriginRef.current);
        };
        const handleRoomEvent = async (event) => {
            if (event.game_id !== gameId) {
                return;
            }
            if (activeRoomIdRef.current && event.room_id !== activeRoomIdRef.current) {
                return;
            }
            const roomID = event.room_id;
            const incomingVersion = Number(event.state_version ?? 0);
            if (roomID && incomingVersion > 0) {
                const currentVersion = roomStateVersionRef.current.get(roomID) ?? 0;
                if (currentVersion > 0 && incomingVersion > currentVersion + 1) {
                    try {
                        const latestState = await getGameRoomState(gameId, roomID);
                        const latestVersion = Number(latestState.room.state_version ?? incomingVersion);
                        roomStateVersionRef.current.set(roomID, latestVersion);
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
                        });
                        return;
                    }
                    catch {
                        // fall through and still dispatch incoming event
                    }
                }
                if (incomingVersion < currentVersion) {
                    return;
                }
                roomStateVersionRef.current.set(roomID, incomingVersion);
            }
            forwardEventToIframe(event);
        };
        const unsubscribe = wsClient.onRoomEvent((event) => {
            void handleRoomEvent(event);
        });
        return () => {
            unsubscribe();
            wsClient.disconnect();
            if (gameWsRef.current === wsClient) {
                gameWsRef.current = null;
            }
        };
    }, [gameId, playUrl, token]);
    const toggleFullscreen = React.useCallback(async () => {
        const node = playerContainerRef.current;
        if (!node) {
            return;
        }
        try {
            if (!document.fullscreenElement) {
                await node.requestFullscreen();
            }
            else {
                await document.exitFullscreen();
            }
        }
        catch {
            // no-op
        }
    }, []);
    const toggleMute = React.useCallback(() => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        // Cooperative games can listen for this event and mute internally.
        iframeRef.current?.contentWindow?.postMessage({ type: 'GO_PORTAL_AUDIO_TOGGLE', muted: nextMuted }, '*');
    }, [isMuted]);
    const emitJoinRoomIntent = React.useCallback(() => {
        if (!roomIdFromQuery) {
            return;
        }
        iframeRef.current?.contentWindow?.postMessage({
            type: 'GOPORTAL_GAME_EVENT',
            payload: {
                event_id: `join-intent-${Date.now()}`,
                event_type: 'gop.sdk.join_room_intent',
                room_id: roomIdFromQuery,
                occurred_at: new Date().toISOString(),
            },
        }, sdkTargetOriginRef.current);
    }, [roomIdFromQuery]);
    React.useEffect(() => {
        const sendResponse = (params) => {
            iframeRef.current?.contentWindow?.postMessage({
                type: 'GOPORTAL_SDK_RESPONSE',
                protocol_version: params.protocolVersion,
                request_id: params.requestId,
                ok: params.ok,
                data: params.data,
                error: params.error,
                error_code: params.errorCode,
                retryable: params.retryable,
            }, params.targetOrigin);
        };
        const sendSDKEvent = (payload, targetOrigin) => {
            iframeRef.current?.contentWindow?.postMessage({
                type: 'GOPORTAL_GAME_EVENT',
                payload,
            }, targetOrigin);
        };
        const sendShareStatusEvent = (params) => {
            sendSDKEvent({
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
            }, params.targetOrigin);
        };
        const requestShareSelection = async (action) => {
            if (sharePickerResolverRef.current) {
                sharePickerResolverRef.current(null);
                sharePickerResolverRef.current = null;
            }
            setSharePickerBusy(false);
            setSharePickerIntent({ action });
            return new Promise((resolve) => {
                sharePickerResolverRef.current = resolve;
            });
        };
        const onMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow) {
                return;
            }
            if (sdkTargetOrigin !== '*' && event.origin !== sdkTargetOrigin) {
                return;
            }
            const payload = event.data;
            if (!payload || payload.type !== 'GOPORTAL_SDK_REQUEST') {
                return;
            }
            const requestId = typeof payload.request_id === 'string' ? payload.request_id : `${Date.now()}`;
            const action = typeof payload.action === 'string' ? payload.action : '';
            const body = payload.payload ?? {};
            const protocolVersion = typeof payload.protocol_version === 'string' ? payload.protocol_version : '1.0';
            const responseOrigin = sdkTargetOrigin === '*' ? event.origin || '*' : sdkTargetOrigin;
            const fail = (message, errorCode, retryable = false) => {
                sendResponse({
                    requestId,
                    ok: false,
                    protocolVersion,
                    targetOrigin: responseOrigin,
                    error: message,
                    errorCode,
                    retryable,
                });
            };
            const ensureSession = async (channelId) => {
                const currentSessionId = sdkSessionIdRef.current;
                if (currentSessionId) {
                    return currentSessionId;
                }
                const session = await startGameSession(gameId, { channel_id: channelId, metadata: { source: 'game-sdk' } });
                sdkSessionIdRef.current = session.id;
                setSdkSessionId(session.id);
                return session.id;
            };
            const run = async () => {
                const storageUserKey = currentUserId || 'guest';
                const dataKeyPrefix = `goportal:sdk:data:${gameId}:${storageUserKey}:`;
                const leaderboardStorageKey = `goportal:sdk:leaderboard:${gameId}`;
                const parseLeaderboard = () => {
                    try {
                        const raw = window.localStorage.getItem(leaderboardStorageKey);
                        return raw ? JSON.parse(raw) : {};
                    }
                    catch {
                        return {};
                    }
                };
                const saveLeaderboard = (value) => {
                    window.localStorage.setItem(leaderboardStorageKey, JSON.stringify(value));
                };
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
                                user_profile: true,
                                cloud_data: true,
                                leaderboard: true,
                                room_presence: true,
                                join_room_intent: true,
                            },
                        },
                    });
                    return;
                }
                if (action === 'init') {
                    const session = await startGameSession(gameId, {
                        channel_id: normalizeOptionalID(body.channel_id) ?? channelIdFromQuery,
                        room_id: normalizeOptionalID(body.room_id),
                        metadata: body.metadata,
                    });
                    const roomId = normalizeOptionalID(body.room_id);
                    if (roomId) {
                        activeRoomIdRef.current = roomId;
                        gameWsRef.current?.subscribeRoom(roomId);
                    }
                    sdkSessionIdRef.current = session.id;
                    setSdkSessionId(session.id);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { session_id: session.id },
                    });
                    return;
                }
                if (action === 'shareScore' || action === 'shareAchievement' || action === 'shareGame' || action === 'shareSessionStart' || action === 'shareRoom') {
                    const shareAction = action;
                    const shareEnabled = body.share !== false;
                    let selection = null;
                    let targetChannelId = normalizeOptionalID(body.channel_id) ?? channelIdFromQuery;
                    try {
                        if (shareEnabled && !targetChannelId) {
                            sendShareStatusEvent({
                                requestId,
                                action: shareAction,
                                status: 'opened',
                                targetOrigin: responseOrigin,
                            });
                            selection = await requestShareSelection(shareAction);
                            if (!selection) {
                                sendShareStatusEvent({
                                    requestId,
                                    action: shareAction,
                                    status: 'cancelled',
                                    targetOrigin: responseOrigin,
                                });
                                fail('Share cancelled by user', 'ERR_BAD_REQUEST', false);
                                return;
                            }
                            targetChannelId = selection.channelId;
                        }
                        if (shareEnabled && targetChannelId) {
                            sendShareStatusEvent({
                                requestId,
                                action: shareAction,
                                status: 'submitted',
                                targetOrigin: responseOrigin,
                                channelId: targetChannelId,
                                serverId: selection?.serverId,
                            });
                        }
                        if (shareAction === 'shareScore') {
                            const sessionId = await ensureSession(targetChannelId);
                            const eventCreated = await createGameEvent(gameId, sessionId, {
                                event_type: 'score',
                                idempotency_key: body.idempotency_key,
                                score: body.score,
                                payload: body.payload,
                            });
                            const shared = Boolean(shareEnabled && targetChannelId);
                            if (shared && targetChannelId) {
                                await shareGameToChannel(gameId, {
                                    channel_id: targetChannelId,
                                    session_id: sessionId,
                                    event_id: eventCreated.id,
                                    share_type: 'score',
                                    score: body.score,
                                    comment: body.comment,
                                });
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
                                });
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
                            });
                            return;
                        }
                        if (shareAction === 'shareAchievement') {
                            const sessionId = await ensureSession(targetChannelId);
                            const eventCreated = await createGameEvent(gameId, sessionId, {
                                event_type: 'achievement',
                                idempotency_key: body.idempotency_key,
                                achievement_code: body.achievement_code,
                                achievement_title: body.achievement_title,
                                payload: body.payload,
                            });
                            const shared = Boolean(shareEnabled && targetChannelId);
                            if (shared && targetChannelId) {
                                await shareGameToChannel(gameId, {
                                    channel_id: targetChannelId,
                                    session_id: sessionId,
                                    event_id: eventCreated.id,
                                    share_type: 'achievement',
                                    achievement: body.achievement_title ?? body.achievement_code,
                                    comment: body.comment,
                                });
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
                                });
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
                            });
                            return;
                        }
                        if (shareAction === 'shareGame' || shareAction === 'shareRoom') {
                            const shared = Boolean(shareEnabled && targetChannelId);
                            if (shared && targetChannelId) {
                                await shareGameToChannel(gameId, {
                                    channel_id: targetChannelId,
                                    share_type: shareAction === 'shareRoom' ? 'room' : 'game',
                                    room_id: typeof body.room_id === 'string' ? body.room_id : undefined,
                                    room_name: typeof body.room_name === 'string' ? body.room_name : undefined,
                                    comment: body.comment,
                                });
                                sendShareStatusEvent({
                                    requestId,
                                    action: shareAction,
                                    status: 'shared',
                                    targetOrigin: responseOrigin,
                                    channelId: targetChannelId,
                                    serverId: selection?.serverId,
                                });
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
                            });
                            return;
                        }
                        const sessionId = await ensureSession(targetChannelId);
                        const shared = Boolean(shareEnabled && targetChannelId);
                        if (shared && targetChannelId) {
                            await shareGameToChannel(gameId, {
                                channel_id: targetChannelId,
                                session_id: sessionId,
                                share_type: 'game',
                                comment: body.comment,
                            });
                            sendShareStatusEvent({
                                requestId,
                                action: shareAction,
                                status: 'shared',
                                targetOrigin: responseOrigin,
                                sessionId,
                                channelId: targetChannelId,
                                serverId: selection?.serverId,
                            });
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
                        });
                        return;
                    }
                    catch (err) {
                        sendShareStatusEvent({
                            requestId,
                            action: shareAction,
                            status: 'failed',
                            targetOrigin: responseOrigin,
                            channelId: targetChannelId,
                            serverId: selection?.serverId,
                            error: err instanceof Error ? err.message : 'Share failed',
                        });
                        throw err;
                    }
                }
                if (action === 'createRoom') {
                    const room = await createGameRoom(gameId, {
                        channel_id: normalizeOptionalID(body.channel_id) ?? channelIdFromQuery,
                        room_name: body.room_name,
                        max_players: body.max_players,
                    });
                    activeRoomIdRef.current = room.room.id;
                    roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1));
                    gameWsRef.current?.subscribeRoom(room.room.id);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: room,
                    });
                    return;
                }
                if (action === 'listOpenRooms') {
                    const rooms = await listOpenGameRooms(gameId, {
                        limit: Number(body.limit ?? 20),
                        offset: Number(body.offset ?? 0),
                    });
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: rooms,
                    });
                    return;
                }
                if (action === 'joinRoom') {
                    if (typeof body.room_id !== 'string' || !body.room_id) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    const room = await joinGameRoom(gameId, body.room_id);
                    activeRoomIdRef.current = room.room.id;
                    roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1));
                    gameWsRef.current?.subscribeRoom(room.room.id);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: room,
                    });
                    return;
                }
                if (action === 'leaveRoom') {
                    if (typeof body.room_id !== 'string' || !body.room_id) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    const room = await leaveGameRoom(gameId, body.room_id);
                    if (activeRoomIdRef.current === body.room_id) {
                        activeRoomIdRef.current = null;
                    }
                    if (typeof body.room_id === 'string' && body.room_id) {
                        roomStateVersionRef.current.delete(body.room_id);
                    }
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: room,
                    });
                    return;
                }
                if (action === 'updateRoom') {
                    if (typeof body.room_id !== 'string' || !body.room_id) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    const roomID = body.room_id.trim();
                    roomInviteParamsRef.current.set(roomID, {
                        is_joinable: body.is_joinable !== false,
                        invite_params: body.invite_params ?? null,
                        metadata: body.metadata ?? null,
                    });
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { updated: true, room_id: roomID },
                    });
                    return;
                }
                if (action === 'leftRoom') {
                    const roomID = typeof body.room_id === 'string' ? body.room_id.trim() : activeRoomIdRef.current;
                    if (roomID) {
                        roomInviteParamsRef.current.delete(roomID);
                        if (activeRoomIdRef.current === roomID) {
                            activeRoomIdRef.current = null;
                        }
                    }
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { left: true },
                    });
                    return;
                }
                if (action === 'getUser') {
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: {
                            user_id: currentUserId || 'guest',
                            display_name: currentUserId ? `User ${currentUserId.slice(0, 8)}` : 'Guest',
                            avatar_url: undefined,
                            is_guest: !currentUserId,
                        },
                    });
                    return;
                }
                if (action === 'showAuthPrompt') {
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: {
                            success: Boolean(currentUserId),
                            user: {
                                user_id: currentUserId || 'guest',
                                display_name: currentUserId ? `User ${currentUserId.slice(0, 8)}` : 'Guest',
                                avatar_url: undefined,
                                is_guest: !currentUserId,
                            },
                        },
                    });
                    return;
                }
                if (action === 'dataGet') {
                    const key = typeof body.key === 'string' ? body.key.trim() : '';
                    if (!key) {
                        fail('key is required', 'ERR_BAD_REQUEST', false);
                        return;
                    }
                    const raw = window.localStorage.getItem(`${dataKeyPrefix}${key}`);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: raw
                            ? { key, found: true, value: JSON.parse(raw) }
                            : { key, found: false },
                    });
                    return;
                }
                if (action === 'dataSet') {
                    const key = typeof body.key === 'string' ? body.key.trim() : '';
                    if (!key) {
                        fail('key is required', 'ERR_BAD_REQUEST', false);
                        return;
                    }
                    window.localStorage.setItem(`${dataKeyPrefix}${key}`, JSON.stringify(body.value ?? null));
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { ok: true },
                    });
                    return;
                }
                if (action === 'dataRemove') {
                    const key = typeof body.key === 'string' ? body.key.trim() : '';
                    if (!key) {
                        fail('key is required', 'ERR_BAD_REQUEST', false);
                        return;
                    }
                    window.localStorage.removeItem(`${dataKeyPrefix}${key}`);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { ok: true },
                    });
                    return;
                }
                if (action === 'submitScore') {
                    const leaderboardID = typeof body.leaderboard_id === 'string' ? body.leaderboard_id.trim() : '';
                    const score = Number(body.score ?? NaN);
                    if (!leaderboardID || Number.isNaN(score)) {
                        fail('leaderboard_id and score are required', 'ERR_BAD_REQUEST', false);
                        return;
                    }
                    const allBoards = parseLeaderboard();
                    const list = Array.isArray(allBoards[leaderboardID]) ? allBoards[leaderboardID] : [];
                    list.push({
                        user_id: currentUserId || 'guest',
                        display_name: currentUserId ? `User ${currentUserId.slice(0, 8)}` : 'Guest',
                        score,
                        metadata: body.metadata ?? null,
                        created_at: new Date().toISOString(),
                    });
                    list.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
                    allBoards[leaderboardID] = list.slice(0, 200);
                    saveLeaderboard(allBoards);
                    const rank = allBoards[leaderboardID].findIndex((item) => item.user_id === (currentUserId || 'guest') && Number(item.score) === score) + 1;
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { accepted: true, rank: rank > 0 ? rank : undefined },
                    });
                    return;
                }
                if (action === 'getLeaderboard') {
                    const leaderboardID = typeof body.leaderboard_id === 'string' ? body.leaderboard_id.trim() : '';
                    if (!leaderboardID) {
                        fail('leaderboard_id is required', 'ERR_BAD_REQUEST', false);
                        return;
                    }
                    const scope = body.scope === 'friends' || body.scope === 'channel' ? body.scope : 'global';
                    const limit = Math.max(1, Math.min(100, Number(body.limit ?? 20)));
                    const allBoards = parseLeaderboard();
                    const list = Array.isArray(allBoards[leaderboardID]) ? allBoards[leaderboardID] : [];
                    const entries = list.slice(0, limit).map((item, idx) => ({
                        rank: idx + 1,
                        user_id: String(item.user_id ?? 'guest'),
                        display_name: typeof item.display_name === 'string' ? item.display_name : undefined,
                        score: Number(item.score ?? 0),
                        metadata: item.metadata,
                        created_at: typeof item.created_at === 'string' ? item.created_at : undefined,
                    }));
                    const me = entries.find((item) => item.user_id === (currentUserId || 'guest'));
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: {
                            leaderboard_id: leaderboardID,
                            scope,
                            entries,
                            me,
                        },
                    });
                    return;
                }
                if (action === 'getRoomState') {
                    if (typeof body.room_id !== 'string' || !body.room_id) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    const room = await getGameRoomState(gameId, body.room_id);
                    activeRoomIdRef.current = room.room.id;
                    roomStateVersionRef.current.set(room.room.id, Number(room.room.state_version ?? 1));
                    gameWsRef.current?.subscribeRoom(room.room.id);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: room,
                    });
                    return;
                }
                if (action === 'subscribeRoom') {
                    const roomID = typeof body.room_id === 'string' ? body.room_id : '';
                    if (!roomID) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    activeRoomIdRef.current = roomID;
                    gameWsRef.current?.subscribeRoom(roomID);
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { subscribed: true, room_id: roomID },
                    });
                    return;
                }
                if (action === 'sendState') {
                    if (typeof body.room_id !== 'string' || !body.room_id) {
                        fail('room_id is required', 'ERR_ROOM_REQUIRED', false);
                        return;
                    }
                    const roomID = body.room_id.trim();
                    const stateVersion = Number(body.state_version ?? 0);
                    activeRoomIdRef.current = roomID;
                    gameWsRef.current?.subscribeRoom(roomID);
                    const published = gameWsRef.current?.publishState({
                        game_id: gameId,
                        room_id: roomID,
                        state: body.state,
                        state_version: stateVersion,
                        room_status: 'open',
                        channel_id: channelIdFromQuery ?? undefined,
                    });
                    if (!published) {
                        fail('Realtime socket is not connected', 'ERR_INTERNAL', true);
                        return;
                    }
                    const stateSessionId = await ensureSession(channelIdFromQuery);
                    await createGameEvent(gameId, stateSessionId, {
                        event_type: 'state',
                        payload: {
                            room_id: roomID,
                            state: body.state,
                            state_version: stateVersion,
                        },
                        idempotency_key: typeof body.idempotency_key === 'string' && body.idempotency_key.trim()
                            ? body.idempotency_key.trim()
                            : `state-${roomID}-${stateVersion}-${Date.now()}`,
                    });
                    sendResponse({
                        requestId,
                        ok: true,
                        protocolVersion: '2.0',
                        targetOrigin: responseOrigin,
                        data: { event_id: `ws-${Date.now()}` },
                    });
                    return;
                }
                fail('Unsupported SDK action', 'ERR_UNSUPPORTED_ACTION', false);
            };
            void run().catch((err) => {
                fail(err instanceof Error ? err.message : 'SDK command failed', 'ERR_INTERNAL', false);
            });
        };
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('message', onMessage);
        };
    }, [channelIdFromQuery, currentUserId, gameId, sdkTargetOrigin]);
    if (error) {
        return _jsx("div", { className: "p-6 text-sm text-red-500", children: error });
    }
    if (!playUrl) {
        return _jsx("div", { className: "p-6 text-sm text-muted-foreground", children: "Preparing game..." });
    }
    return (_jsxs("div", { className: "min-h-screen bg-background", children: [_jsxs("div", { className: "mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:px-6", children: [_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Link, { to: `/games/${gameId}`, className: "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Back"] }), _jsx(Link, { to: "/games", className: "text-xs text-muted-foreground hover:text-foreground", children: "Library" })] }), _jsx("div", { className: "text-sm font-semibold", children: title }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("button", { type: "button", onClick: toggleMute, className: "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent", children: [isMuted ? _jsx(VolumeX, { className: "h-3.5 w-3.5" }) : _jsx(Volume2, { className: "h-3.5 w-3.5" }), isMuted ? 'Unmute' : 'Mute'] }), _jsxs("button", { type: "button", onClick: () => setReloadKey((value) => value + 1), className: "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent", children: [_jsx(RefreshCcw, { className: "h-3.5 w-3.5" }), "Reload"] }), _jsxs("button", { type: "button", onClick: () => void toggleFullscreen(), className: "inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent", children: [isFullscreen ? _jsx(Minimize2, { className: "h-3.5 w-3.5" }) : _jsx(Maximize2, { className: "h-3.5 w-3.5" }), isFullscreen ? 'Exit' : 'Fullscreen'] })] })] }), _jsx("div", { ref: playerContainerRef, className: "relative overflow-hidden rounded-xl border border-border bg-black", children: _jsx("iframe", { ref: iframeRef, src: playUrl, title: title, onLoad: () => emitJoinRoomIntent(), className: "h-[calc(100vh-10rem)] w-full bg-background", sandbox: "allow-scripts allow-forms allow-pointer-lock allow-popups allow-same-origin" }, reloadKey) })] }), _jsx(GameSharePickerDialog, { open: Boolean(sharePickerIntent), action: sharePickerIntent?.action ?? null, loading: sharePickerBusy, preferredChannelId: channelIdFromQuery, onCancel: () => resolveSharePicker(null), onConfirm: (selection) => {
                    setSharePickerBusy(true);
                    resolveSharePicker(selection);
                } })] }));
};
export const QuickGamesLauncher = ({ open, onOpenChange }) => {
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    React.useEffect(() => {
        if (!open) {
            return;
        }
        setLoading(true);
        void listTrendingGames({ limit: 12 })
            .then((data) => setItems(data))
            .finally(() => setLoading(false));
    }, [open]);
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(Gamepad2, { className: "h-4 w-4" }), "Quick Games Launcher"] }), _jsx(DialogDescription, { children: "Pick a trending game to open immediately." })] }), loading ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "Loading games..." })) : (_jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: items.map((item) => (_jsxs("button", { type: "button", onClick: () => {
                            onOpenChange(false);
                            void navigate(`/games/${item.game.id}/play`);
                        }, className: "rounded-md border border-border bg-background p-3 text-left transition hover:bg-accent", children: [_jsx("div", { className: "text-sm font-medium", children: item.game.title }), _jsxs("div", { className: "mt-1 text-xs text-muted-foreground", children: [item.game.source_type, " \u2022 ", item.game.avg_rating.toFixed(1), " stars"] })] }, `quick-${item.game.id}`))) }))] }) }));
};
//# sourceMappingURL=GameViews.js.map