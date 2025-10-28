import { Skeleton } from "@/components/ui/skeleton";

function Loading() {
    return (
        <div className="flex flex-col items-center justify-center">

        <Skeleton className="h-[720px] w-[1280px]" />
        </div>
    )
}

export default Loading