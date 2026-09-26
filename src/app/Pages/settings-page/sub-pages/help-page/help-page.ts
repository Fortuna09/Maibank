import { Component, inject } from '@angular/core';
import { Icon } from '../../../../Components/icon/icon';
import { TourService } from '../../../../Services/tour.service';

interface HelpTopic {
  question: string;
  answer: string[];
}

/** Perguntas que geram confusão na primeira vez: cada resposta em poucas linhas. */
const TOPICS: HelpTopic[] = [
  {
    question: 'O que são as divisões?',
    answer: [
      'São "caixinhas" do seu dinheiro: Uso diário, Reserva de emergência, Planos futuros… Cada uma recebe uma porcentagem das suas entradas.',
      'Você cria, renomeia e ajusta as porcentagens em Configurações > Distribuição. A soma precisa dar 100%.',
    ],
  },
  {
    question: 'Qual a diferença entre Uso diário e Saldo total?',
    answer: [
      'Saldo total é tudo o que você tem, somando todas as divisões.',
      'Uso diário é só a parte separada para o dia a dia — o que dá para gastar sem mexer na reserva nem nos planos. Por isso ele é o número grande no Início.',
    ],
  },
  {
    question: 'Numa entrada, "uma divisão" ou "distribuir entre todas"?',
    answer: [
      'Distribuir reparte o valor pelas porcentagens de cada divisão — é o certo para salário e rendas do mês.',
      'Uma divisão manda tudo para um lugar só — útil para um dinheiro com destino certo, como um presente que vai direto para a reserva.',
    ],
  },
  {
    question: 'Por que a compra no crédito não saiu do meu saldo?',
    answer: [
      'Porque ainda não saiu mesmo: ela entra na fatura do cartão. Parceladas, cada parcela cai numa fatura seguinte.',
      'Quando você paga a fatura, abra Crédito > Faturas e use "Registrar pagamento" — aí o valor vira uma saída da divisão que você escolher.',
      'O dia de fechamento e o de vencimento ficam em Configurações > Crédito.',
    ],
  },
  {
    question: 'Só sei o valor da parcela, não o total. E agora?',
    answer: [
      'No campo de valor há um seletor total | parcela. Escolha parcela, digite quanto é cada uma e quantas são: o total é calculado sozinho — com juros embutidos, se houver.',
    ],
  },
  {
    question: 'Como funciona o salário automático?',
    answer: [
      'Em Configurações > Salário você informa o valor e o dia do mês em que ele cai. A partir desse dia, ao abrir o app, o salário entra uma vez por mês e já é distribuído entre as divisões.',
    ],
  },
  {
    question: 'Como a meta calcula a previsão?',
    answer: [
      'Com o valor que falta e o quanto você disse que vai guardar por mês ou por semana. Se os aportes atrasarem em relação ao combinado, a meta aparece como atrasada.',
      'Para somar um valor guardado, use "Adicionar valor" na própria meta.',
    ],
  },
  {
    question: 'As simulações salvam alguma coisa?',
    answer: ['Não. Simulação é só para ver o efeito de uma compra nos próximos meses — nada vira lançamento.'],
  },
  {
    question: 'A Mai faz lançamentos sozinha?',
    answer: [
      'Nunca. Ela prepara o lançamento, a meta ou a simulação e mostra um cartão com os detalhes; só acontece se você clicar em Confirmar.',
      'Sem chave de API configurada ela funciona em modo local e entende frases simples, como "gastei 50 no mercado".',
    ],
  },
  {
    question: 'Meus dados vêm do banco? Quem vê o que eu lanço?',
    answer: [
      'Nada vem do banco: tudo é lançado por você. Seus dados ficam na sua conta e ninguém mais os enxerga.',
      'Aparência, capa e a conversa com a Mai ficam só neste navegador.',
    ],
  },
];

@Component({
  selector: 'app-help-page',
  imports: [Icon],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
})
export class HelpPage {
  readonly tour = inject(TourService);
  readonly topics = TOPICS;
}
