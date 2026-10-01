import { ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Native lazy-loaded image that fades/blurs in once decoded, with a shimmering
 * placeholder underneath so layout never jumps.
 */
export function LazyImage({
  className,
  wrapperClassName,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { wrapperClassName?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={cn("relative block overflow-hidden", wrapperClassName)}>
      {!loaded && <span aria-hidden className="absolute inset-0 skeleton-shimmer" />}
      <img
        {...props}
        alt={alt}
        loading={props.loading ?? "lazy"}
        decoding={props.decoding ?? "async"}
        onLoad={(e) => {
          setLoaded(true);
          props.onLoad?.(e);
        }}
        onError={(e) => {
          setLoaded(true);
          props.onError?.(e);
        }}
        className={cn(
          "transition-[opacity,filter,transform] duration-500 ease-out",
          loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-[1.02]",
          className,
        )}
      />
    </span>
  );
}

export default LazyImage;