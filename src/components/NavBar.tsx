import Link from "next/link";

export function NavBar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Imago
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/collection"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Collection
            </Link>
            <Link
              href="/statistics"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Statistics
            </Link>
            <Link
              href="/tools"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Tools
            </Link>
            <Link
              href="/add"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white hover:bg-blue-700"
              aria-label="Add Card"
            >
              +
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
