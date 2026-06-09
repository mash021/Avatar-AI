import type { ReactNode } from "react";

type RTLWrapperProps = {
  isRtl: boolean;
  children: ReactNode;
  className?: string;
};

export function RTLWrapper({ isRtl, children, className }: RTLWrapperProps) {
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
