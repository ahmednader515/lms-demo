import Image from "next/image";
import { getCdnUrl } from "@/lib/cdn";

export const Logo = () => {
    return (
        <Image
            height={100}
            width={100}
            alt="logo"
            src={getCdnUrl("/logo.png")}
            unoptimized
        />
    )
}