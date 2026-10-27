import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1 className="page-title">Сторінку не знайдено</h1>
      <p className="mt-2 text-text2">
        Можливо, її видалили. <Link href="/" className="link">На головну</Link>
      </p>
    </div>
  );
}
