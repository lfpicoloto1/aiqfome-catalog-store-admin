import type { AppPath } from "../useAppPath.ts";
import { LegalShell } from "./LegalShell.tsx";

type Props = {
  navigate: (to: AppPath) => void;
};

export function TermsPage({ navigate }: Props) {
  return (
    <LegalShell title="Termos de uso" navigate={navigate}>
      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        1. Aceitação
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Ao aceder e utilizar este painel de administração da loja (“serviço”), o utilizador confirma que leu e concorda
        com estes Termos de uso. Se não concordar, não deve utilizar o serviço.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        2. Descrição do serviço
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O serviço destina-se a lojistas que integram com a plataforma aiqfome através do fluxo de autenticação Magalu
        ID (Geraldo), permitindo consultar e atualizar informações da loja suportadas por esta aplicação (por exemplo
        horários, prazos e configurações expostas pela API configurada no ambiente).
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        3. Conta e segurança
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O acesso depende de credenciais e permissões concedidas pelo fornecedor de identidade e pela aiqfome. O
        utilizador é responsável por manter o dispositivo e a sessão seguros e por qualquer atividade realizada após
        autenticação bem-sucedida.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        4. Uso aceitável
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Compromete-se a utilizar o serviço de acordo com a lei aplicável, com as políticas da aiqfome e do Magalu ID, e
        a não tentar comprometer a segurança, disponibilidade ou integridade dos sistemas.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        5. Disponibilidade e alterações
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O serviço pode ser atualizado, suspenso ou descontinuado. Estes termos podem ser alterados; a versão em vigor é
        a publicada nesta página. O uso continuado após alterações constitui aceitação dos novos termos, salvo
        disposição legal em contrário.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        6. Limitação de responsabilidade
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        O serviço é fornecido “como está”. Na medida permitida pela lei, não se garante ausência de erros ou
        indisponibilidade. A aiqfome, o Magalu ID e terceiros envolvidos na cadeia de dados podem aplicar as suas
        próprias condições e limitações.
      </geraldo-text>

      <geraldo-text variant="h3-section" weight="medium" as="h2" className="legal-block-title">
        7. Contacto
      </geraldo-text>
      <geraldo-text variant="body-default" as="p">
        Para questões sobre estes termos ou sobre o tratamento de dados, utilize os canais oficiais da sua relação
        comercial com a aiqfome ou o contacto indicado pelo responsável pelo projeto deste painel na sua organização.
      </geraldo-text>

      <geraldo-text variant="caption" as="p" className="legal-updated">
        Última atualização: abril de 2026. Texto informativo — ajuste jurídico local conforme o seu caso.
      </geraldo-text>
    </LegalShell>
  );
}
