interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="rounded-pill bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
      {message}
    </div>
  );
}
