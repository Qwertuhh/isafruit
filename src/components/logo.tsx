import Image from "next/image";

function Logo({size, className, ...props}: {size: number, className?: string}) {
    return (
        <Image src="/logo.svg" alt="Logo" width={size} height={size} style={{filter: "brightness(0)"}} className={className} {...props}/>
    );
}

export default Logo;
