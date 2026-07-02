import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PainelPage } from "@/pages/PainelPage";
import { PlanilhaPage } from "@/pages/PlanilhaPage";
import { ListaPage } from "@/pages/ListaPage";
import { DetalhePage } from "@/pages/DetalhePage";
import { MovimentacaoPage } from "@/pages/MovimentacaoPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TarefasPage } from "@/pages/TarefasPage";
import { FaturamentoPage } from "@/pages/FaturamentoPage";
import { AgendaAcessoriosPage } from "@/pages/AgendaAcessoriosPage";
import { EntreguesPage } from "@/pages/EntreguesPage";
import { CadastrosPage } from "@/pages/CadastrosPage";
import { RelatoriosPage } from "@/pages/RelatoriosPage";
import { FluxogramaPage } from "@/pages/FluxogramaPage";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PainelPage />} />
          <Route path="/planilha" element={<PlanilhaPage />} />
          <Route path="/veiculos" element={<ListaPage />} />
          <Route path="/veiculos/:chassi" element={<DetalhePage />} />
          <Route path="/tarefas" element={<TarefasPage />} />
          <Route path="/faturamento" element={<FaturamentoPage />} />
          <Route path="/movimentacao" element={<MovimentacaoPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/agenda-acessorios" element={<AgendaAcessoriosPage />} />
          <Route path="/entregues" element={<EntreguesPage />} />
          <Route path="/cadastros" element={<CadastrosPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/fluxograma" element={<FluxogramaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
