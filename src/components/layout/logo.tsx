import Image from "next/image";

function Logo({
  size,
  background,
  className,
  ...props
}: {
  size: number;
  background?: boolean;
  className?: string;
}) {
  return background ? (
    <Image
      src="/logo-bg.svg"
      alt="Logo"
      width={size}
      height={size}
      className={className}
      {...props}
    />
  ) : (
    <Image
      src="/logo.svg"
      alt="Logo"
      width={size}
      height={size}
      className={className}
      style={{ filter: "brightness(0)" }}
      {...props}
    />
  );
}

export default Logo;
