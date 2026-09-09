import FaqSearchable from "@/components/ui/smoothui/faq-3"
import { homeFaqs } from "@/data/home-faq"

export function HomeFaqSection() {
  return (
    <FaqSearchable
      title="Perguntas frequentes"
      description="Tudo o que você precisa saber sobre a plataforma, o mapa e a atualização de informações no Amapá."
      searchPlaceholder="Buscar perguntas..."
      faqs={homeFaqs}
    />
  )
}
