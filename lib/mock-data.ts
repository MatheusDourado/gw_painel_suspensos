export type Environment = "MCTI" | "COPASA" | "MEC" | "ANAC" | "AEB"
export type Priority = "Crítica" | "Alta" | "Média" | "Baixa"
export type SuspensionReason =
  | "Aguardando Cliente"
  | "Aguardando Terceiros"
  | "Aguardando Peças"
  | "Agendamento"
  | "Análise Técnica"
export type TicketStatus = "Suspenso" | "Agendado" | "Em Atendimento" | "Concluído"

export interface SuspendedTicket {
  id: string
  number: string
  title: string
  environment: Environment
  priority: Priority
  suspensionReason: SuspensionReason
  status: TicketStatus
  suspendedAt: string
  scheduledDate?: string
  daysOpen: number
  analyst: string
  client: string
  slaDeadline: string
  notes?: string
}

export const environments: Environment[] = ["MCTI", "COPASA", "MEC", "ANAC", "AEB"]

export const mockTickets: SuspendedTicket[] = [
  {
    id: "1",
    number: "INC000012345",
    title: "Falha no sistema de autenticação",
    environment: "MCTI",
    priority: "Crítica",
    suspensionReason: "Aguardando Cliente",
    status: "Suspenso",
    suspendedAt: "2026-01-10",
    daysOpen: 4,
    analyst: "Carlos Silva",
    client: "João Pereira",
    slaDeadline: "2026-01-15",
    notes: "Aguardando aprovação do gestor",
  },
  {
    id: "2",
    number: "INC000012346",
    title: "Atualização de servidor de produção",
    environment: "COPASA",
    priority: "Alta",
    suspensionReason: "Agendamento",
    status: "Agendado",
    suspendedAt: "2026-01-08",
    scheduledDate: "2026-01-20",
    daysOpen: 6,
    analyst: "Maria Santos",
    client: "Pedro Costa",
    slaDeadline: "2026-01-18",
  },
  {
    id: "3",
    number: "INC000012347",
    title: "Problema de conectividade VPN",
    environment: "MEC",
    priority: "Média",
    suspensionReason: "Aguardando Terceiros",
    status: "Suspenso",
    suspendedAt: "2026-01-05",
    daysOpen: 9,
    analyst: "Roberto Lima",
    client: "Ana Souza",
    slaDeadline: "2026-01-16",
    notes: "Fornecedor externo em análise",
  },
  {
    id: "4",
    number: "INC000012348",
    title: "Substituição de hardware",
    environment: "ANAC",
    priority: "Baixa",
    suspensionReason: "Aguardando Peças",
    status: "Suspenso",
    suspendedAt: "2026-01-12",
    daysOpen: 2,
    analyst: "Fernanda Oliveira",
    client: "Lucas Mendes",
    slaDeadline: "2026-01-25",
  },
  {
    id: "5",
    number: "INC000012349",
    title: "Migração de banco de dados",
    environment: "AEB",
    priority: "Alta",
    suspensionReason: "Análise Técnica",
    status: "Suspenso",
    suspendedAt: "2026-01-11",
    daysOpen: 3,
    analyst: "André Martins",
    client: "Carla Ribeiro",
    slaDeadline: "2026-01-17",
    notes: "Requer análise de impacto",
  },
  {
    id: "6",
    number: "INC000012350",
    title: "Configuração de firewall",
    environment: "MCTI",
    priority: "Crítica",
    suspensionReason: "Agendamento",
    status: "Agendado",
    suspendedAt: "2026-01-09",
    scheduledDate: "2026-01-15",
    daysOpen: 5,
    analyst: "Paulo Ferreira",
    client: "Juliana Alves",
    slaDeadline: "2026-01-14",
  },
  {
    id: "7",
    number: "INC000012351",
    title: "Restauração de backup",
    environment: "COPASA",
    priority: "Média",
    suspensionReason: "Aguardando Cliente",
    status: "Suspenso",
    suspendedAt: "2026-01-07",
    daysOpen: 7,
    analyst: "Camila Gomes",
    client: "Marcos Dias",
    slaDeadline: "2026-01-19",
  },
  {
    id: "8",
    number: "INC000012352",
    title: "Instalação de certificado SSL",
    environment: "MEC",
    priority: "Alta",
    suspensionReason: "Agendamento",
    status: "Agendado",
    suspendedAt: "2026-01-13",
    scheduledDate: "2026-01-16",
    daysOpen: 1,
    analyst: "Diego Nascimento",
    client: "Patrícia Campos",
    slaDeadline: "2026-01-18",
  },
  {
    id: "9",
    number: "INC000012353",
    title: "Erro em aplicação web",
    environment: "ANAC",
    priority: "Crítica",
    suspensionReason: "Aguardando Terceiros",
    status: "Suspenso",
    suspendedAt: "2026-01-06",
    daysOpen: 8,
    analyst: "Luciana Rocha",
    client: "Ricardo Moura",
    slaDeadline: "2026-01-13",
  },
  {
    id: "10",
    number: "INC000012354",
    title: "Otimização de performance",
    environment: "AEB",
    priority: "Baixa",
    suspensionReason: "Análise Técnica",
    status: "Suspenso",
    suspendedAt: "2026-01-10",
    daysOpen: 4,
    analyst: "Thiago Cardoso",
    client: "Beatriz Freitas",
    slaDeadline: "2026-01-28",
  },
]

export const getStatsByEnvironment = () => {
  return environments.map((env) => ({
    name: env,
    total: mockTickets.filter((t) => t.environment === env).length,
    critical: mockTickets.filter((t) => t.environment === env && t.priority === "Crítica").length,
    scheduled: mockTickets.filter((t) => t.environment === env && t.status === "Agendado").length,
  }))
}

export const getStatsByReason = () => {
  const reasons: SuspensionReason[] = [
    "Aguardando Cliente",
    "Aguardando Terceiros",
    "Aguardando Peças",
    "Agendamento",
    "Análise Técnica",
  ]
  return reasons.map((reason) => ({
    name: reason,
    value: mockTickets.filter((t) => t.suspensionReason === reason).length,
  }))
}

export const getStatsByPriority = () => {
  const priorities: Priority[] = ["Crítica", "Alta", "Média", "Baixa"]
  return priorities.map((priority) => ({
    name: priority,
    value: mockTickets.filter((t) => t.priority === priority).length,
  }))
}

export const getTimelineData = () => {
  return [
    { date: "08/01", suspensos: 12, agendados: 3, concluidos: 5 },
    { date: "09/01", suspensos: 15, agendados: 4, concluidos: 7 },
    { date: "10/01", suspensos: 18, agendados: 6, concluidos: 8 },
    { date: "11/01", suspensos: 14, agendados: 5, concluidos: 10 },
    { date: "12/01", suspensos: 16, agendados: 7, concluidos: 6 },
    { date: "13/01", suspensos: 13, agendados: 8, concluidos: 9 },
    { date: "14/01", suspensos: 10, agendados: 4, concluidos: 11 },
  ]
}
