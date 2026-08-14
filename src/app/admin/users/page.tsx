import { requireRole } from "@/lib/auth";
import { getAllUsers } from "@/lib/queries";
import { toggleUserActive } from "@/app/actions";
import { Shell, Card, StatusBadge } from "@/components/shell";
import { CreateUserForm } from "@/components/forms";

export default async function AdminUsers() {
  const session = await requireRole("ADMIN");
  const allUsers = await getAllUsers();

  return (
    <Shell user={session}>
      <h1 className="mb-4 text-xl font-semibold">Users</h1>
      <Card title="Create user">
        <CreateUserForm />
      </Card>
      <Card title={`All users (${allUsers.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{u.email}</td>
                  <td className="py-2 pr-4"><StatusBadge status={u.role} /></td>
                  <td className="py-2 pr-4">
                    {u.active === 1 ? (
                      <span className="text-green-700">Active</span>
                    ) : (
                      <span className="text-slate-400">Deactivated</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {u.id !== session.id && (
                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                          {u.active === 1 ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
