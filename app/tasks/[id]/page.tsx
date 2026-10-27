import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@/app/actions/tasks";
import { TaskView } from "@/components/TaskView";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const detail = await getTaskDetail(Number(id));
  if (!detail) notFound();
  return (
    <div className="w-full">
      <nav className="mb-6 flex items-center gap-1 text-text2" aria-label="Навігація">
        <Link href="/board" className="rounded px-1 hover:bg-hover">
          Дошка
        </Link>
        <span className="text-text3">/</span>
        <Link href={`/directions/${detail.direction.slug}`} className="rounded px-1 hover:bg-hover">
          {detail.direction.emoji} {detail.direction.name}
        </Link>
      </nav>
      <TaskView taskId={detail.task.id} initial={detail} />
    </div>
  );
}
