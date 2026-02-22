import { cn } from "../../utils/cn";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
    children?: React.ReactNode;
    showRadialGradient?: boolean;
}

export const AuroraBackground = ({
    className,
    children,
    showRadialGradient = true,
    ...props
}: AuroraBackgroundProps) => {
    return (
        <main>
            <div
                className={cn(
                    "relative flex flex-col h-screen items-center justify-center bg-zinc-900 text-slate-950 transition-bg",
                    className
                )}
                {...props}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className={cn(
                            `
                            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
                            [--dark-gradient:repeating-linear-gradient(100deg,var(--color-bg-primary)_0%,var(--color-bg-primary)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--color-bg-primary)_16%)]
                            [--aurora:repeating-linear-gradient(100deg,var(--color-accent-blue)_10%,var(--color-accent-indigo)_15%,var(--color-accent-purple)_20%,var(--color-accent-pink)_25%,var(--color-accent-blue)_30%)]
                            [background-image:var(--dark-gradient),var(--aurora)]
                            [background-size:300%,_200%]
                            [background-position:50%_50%,50%_50%]
                            filter blur-[10px] sm:blur-[20px] lg:blur-[40px] mix-blend-plus-lighter
                            absolute -inset-[10%] opacity-20 will-change-transform
                            animate-aurora
                            `,
                            showRadialGradient &&
                            `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
                        )}
                    ></div>
                </div>
                {children}
            </div>
        </main>
    );
};
