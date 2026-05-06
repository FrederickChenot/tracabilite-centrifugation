import Link from 'next/link';

const outils = [
  {
    href: '/outils/centrifugation',
    title: 'Centrifugation',
    description: 'Traçabilité des sessions de centrifugation et scan des tubes.',
    icon: '⟳',
    color: 'border-teal-500 bg-teal-50 hover:bg-teal-100',
    iconColor: 'text-teal-600',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CH Épinal</h1>
          <p className="text-gray-500 mt-1">Laboratoire de biologie médicale · Outils de traçabilité</p>
        </div>

        <div className="grid gap-4">
          {outils.map((outil) => (
            <Link
              key={outil.href}
              href={outil.href}
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-colors ${outil.color}`}
            >
              <span className={`text-4xl ${outil.iconColor}`}>{outil.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{outil.title}</h2>
                <p className="text-sm text-gray-600">{outil.description}</p>
              </div>
              <span className="ml-auto text-gray-400">→</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between text-xs text-gray-400">
          <span>v1.0</span>
          <Link href="/admin" className="hover:text-gray-600 transition-colors">
            Administration
          </Link>
        </div>
      </div>
    </div>
  );
}
