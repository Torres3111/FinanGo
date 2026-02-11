import {
  DollarSign,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  PieChart,
  Target,
  Settings,
  Moon,
} from "lucide-react-native";
import { AppRoute } from "./routes";

export type MenuItem = {
  id: string;
  label: string;
  icon: any;
  route: AppRoute;
};


export const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      label: "Início",
      icon: PieChart,
      route: "/dashboard-financeiro",
    },
    {
      id: "contas",
      label: "Contas",
      icon: Receipt,
      route: "/contas",
    },
    {
      id: "parcelamentos",
      label: "Parcelas",
      icon: CreditCard,
      route: "/parcelamentos",
    },
    {
      id: "gastos-diarios",
      label: "Registro",
      icon: Target,
      route: "/gastosdiarios",
    },
    {
      id: "config",
      label: "Config",
      icon: Settings,
      route: "/configuracoes",
    },
  ];
