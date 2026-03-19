import { jsx as _jsx } from "react/jsx-runtime";
import ReactPlayer from 'react-player';
export const VideoAttachment = ({ url }) => {
    const isPlayableByReactPlayer = ReactPlayer.canPlay?.(url) ?? false;
    return (_jsx("div", { className: "mt-1 max-w-[400px] overflow-hidden rounded-md", children: isPlayableByReactPlayer ? (_jsx(ReactPlayer, { src: url, width: "400px", height: "225px", controls: true, light: true, playing: false })) : (_jsx("video", { src: url, controls: true, className: "max-h-[300px] max-w-[400px] rounded-md", preload: "metadata" })) }));
};
//# sourceMappingURL=VideoAttachment.js.map