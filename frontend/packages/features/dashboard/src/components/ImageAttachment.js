import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@goportal/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
export const ImageAttachment = ({ attachments }) => {
    const images = useMemo(() => attachments.filter((attachment) => attachment.type === 'image' || attachment.type === 'gif'), [attachments]);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const closeLightbox = useCallback(() => setLightboxIndex(null), []);
    const openLightbox = useCallback((index) => setLightboxIndex(index), []);
    const showPrev = useCallback(() => {
        if (lightboxIndex === null || images.length <= 1) {
            return;
        }
        setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }, [images.length, lightboxIndex]);
    const showNext = useCallback(() => {
        if (lightboxIndex === null || images.length <= 1) {
            return;
        }
        setLightboxIndex((lightboxIndex + 1) % images.length);
    }, [images.length, lightboxIndex]);
    useEffect(() => {
        if (lightboxIndex === null) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeLightbox();
            }
            if (event.key === 'ArrowLeft') {
                showPrev();
            }
            if (event.key === 'ArrowRight') {
                showNext();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [closeLightbox, lightboxIndex, showNext, showPrev]);
    if (images.length === 0) {
        return null;
    }
    const selectedImage = lightboxIndex === null ? null : images[lightboxIndex];
    return (_jsxs(_Fragment, { children: [images.length === 1 ? (_jsx("div", { className: "mt-1 max-w-[400px]", children: _jsxs("div", { className: "relative inline-block", children: [_jsx("img", { src: images[0].url, alt: images[0].filename, className: "rounded-md object-contain max-h-[300px] w-auto cursor-zoom-in hover:brightness-90 transition-all", style: { maxWidth: '400px' }, onClick: () => openLightbox(0) }), images[0].type === 'gif' && (_jsx("span", { className: "absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white", children: "GIF" }))] }) })) : (_jsx("div", { className: cn('mt-1 grid gap-1 rounded-md overflow-hidden', images.length === 2 && 'grid-cols-2 max-w-[400px]', images.length === 3 && 'grid-cols-2 max-w-[400px]', images.length === 4 && 'grid-cols-2 max-w-[400px]'), children: images.slice(0, 4).map((img, index) => (_jsxs("div", { className: cn('relative', images.length === 3 && index === 0 && 'col-span-2'), children: [_jsx("img", { src: img.url, alt: img.filename, className: "h-[200px] w-full cursor-zoom-in object-cover hover:brightness-90", onClick: () => openLightbox(index) }), img.type === 'gif' && (_jsx("span", { className: "absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white", children: "GIF" }))] }, img.id))) })), selectedImage && (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4", onClick: closeLightbox, children: [_jsx("button", { type: "button", className: "absolute right-4 top-4 rounded p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white", onClick: closeLightbox, children: _jsx(X, { className: "h-5 w-5" }) }), images.length > 1 && (_jsx("button", { type: "button", className: "absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white", onClick: (event) => {
                            event.stopPropagation();
                            showPrev();
                        }, children: _jsx(ChevronLeft, { className: "h-5 w-5" }) })), _jsx("img", { src: selectedImage.url, alt: selectedImage.filename, className: "max-h-[90vh] max-w-[90vw] rounded-md object-contain", onClick: (event) => event.stopPropagation() }), images.length > 1 && (_jsx("button", { type: "button", className: "absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white", onClick: (event) => {
                            event.stopPropagation();
                            showNext();
                        }, children: _jsx(ChevronRight, { className: "h-5 w-5" }) }))] }))] }));
};
//# sourceMappingURL=ImageAttachment.js.map