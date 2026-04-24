import type { AppPath } from "../useAppPath.ts";
import { LegalShell } from "./LegalShell.tsx";

type Props = {
  navigate: (to: AppPath) => void;
};

export function PrivacyPage({ navigate }: Props) {
  return (
    <LegalShell title="Política de privacidade" navigate={navigate}>
      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        1. Responsável e âmbito
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Esta política descreve, em linguagem clara, que dados podem estar associados ao uso deste painel de loja
        ligado à aiqfome. O responsável pelo tratamento em relação ao negócio da loja é, em regra, a entidade que opera
        a loja na plataforma; o presente documento cobre o funcionamento típico desta aplicação web e respetiva
        infraestrutura técnica.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        2. Dados tratados
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Podem ser tratados, entre outros: identificadores de sessão e token de acesso armazenado no navegador (por
        exemplo em <code className="kbd">sessionStorage</code>), dados da loja e de configuração obtidos ou enviados
        através da API configurada no backend, registos técnicos necessários à operação (como pedidos HTTP em
        servidor), e informações fornecidas pelo Magalu ID e pela aiqfome no âmbito da autenticação e das operações
        permitidas.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        3. Finalidades
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Os dados são utilizados para autenticar o utilizador, apresentar e atualizar informações da loja, cumprir
        obrigações legais aplicáveis, reforçar a segurança e melhorar a estabilidade do serviço.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        4. Base legal (LGPD)
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Conforme o caso concreto, as bases legais podem incluir execução de contrato ou medidas pré-contratuais,
        legítimo interesse (por exemplo segurança e prevenção de fraude, equilibrado com os direitos do titular),
        cumprimento de obrigação legal ou consentimento quando aplicável. O responsável pelo tratamento na sua
        cadeia (loja / aiqfome) deve formalizar o enquadramento jurídico definitivo.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        5. Partilha e subprocessadores
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O fluxo de login pode envolver o Magalu ID e a aiqfome. A comunicação com a API da aiqfome ocorre através do
        backend configurado para este projeto. Consulte também as políticas de privacidade oficiais dessas entidades.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        6. Conservação
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O token de sessão no navegador é removido ao terminar a sessão ou quando deixa de ser válido. Os prazos de
        conservação de registos em servidor dependem da configuração e da política da organização que opera o
        backend.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        7. Direitos do titular
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização,
        portabilidade, eliminação dos dados desnecessários, informação sobre partilhas e, quando cabível, revogação do
        consentimento. Os pedidos devem ser encaminhados ao canal indicado pelo responsável pelo tratamento (loja /
        aiqfome).
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        8. Cookies e tecnologias semelhantes
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Esta aplicação pode utilizar armazenamento local do navegador para manter a sessão. Cookies de terceiros
        podem aplicar-se no fluxo Magalu ID conforme a configuração do fornecedor.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        9. Alterações
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Esta política pode ser atualizada. A data indicada abaixo identifica a última revisão publicada nesta página.
      </geraldo-text>

      <geraldo-text variant="caption" as="p" className="legal-updated">
        Última atualização: abril de 2026. Texto informativo — complete com encarregado de dados (DPO) e canais oficiais
        da sua operação.
      </geraldo-text>
    </LegalShell>
  );
}
