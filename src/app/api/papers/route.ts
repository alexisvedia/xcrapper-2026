import { NextResponse } from 'next/server';
import { Paper } from '@/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // Use provided date or default to today
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  
  // Format date string for response
  const dateStr = targetDate.toISOString().split('T')[0];

  // Mock Data
  const mockPapers: Paper[] = [
    {
      id: 'paper-1',
      title: 'Attention Is All You Need V2: Efficient Transformers',
      titleEs: 'Atención es todo lo que necesitas V2: Transformers Eficientes',
      abstract: 'We propose a new architecture that reduces the computational complexity of the Transformer model from quadratic to linear, enabling the processing of infinitely long sequences without loss of accuracy.',
      abstractEs: 'Proponemos una nueva arquitectura que reduce la complejidad computacional del modelo Transformer de cuadrática a lineal, permitiendo el procesamiento de secuencias infinitamente largas sin pérdida de precisión.',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
      institution: 'Google Research',
      arxivId: '2312.00001',
      upvotes: 1542,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00001',
      thumbnail: 'https://arxiv.org/html/2312.00001/assets/x1.png'
    },
    {
      id: 'paper-2',
      title: 'GPT-5 Architecture: Multimodal Reasoning at Scale',
      titleEs: 'Arquitectura GPT-5: Razonamiento Multimodal a Escala',
      abstract: 'This paper details the architectural advancements in GPT-5, focusing on its ability to seamlessly integrate text, image, audio, and video modalities for superior reasoning capabilities.',
      abstractEs: 'Este artículo detalla los avances arquitectónicos en GPT-5, centrándose en su capacidad para integrar perfectamente las modalidades de texto, imagen, audio y video para capacidades de razonamiento superiores.',
      authors: ['OpenAI Team'],
      institution: 'OpenAI',
      arxivId: '2312.00002',
      upvotes: 2890,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00002'
    },
    {
      id: 'paper-3',
      title: 'LoRA-Pro: Adaptive Low-Rank Adaptation',
      titleEs: 'LoRA-Pro: Adaptación Adaptativa de Bajo Rango',
      abstract: 'We introduce LoRA-Pro, an enhanced method for fine-tuning Large Language Models that dynamically adjusts the rank of adaptation matrices based on the complexity of the downstream task.',
      abstractEs: 'Introducimos LoRA-Pro, un método mejorado para el ajuste fino de Grandes Modelos de Lenguaje que ajusta dinámicamente el rango de las matrices de adaptación basándose en la complejidad de la tarea posterior.',
      authors: ['Edward Hu', 'Yelong Shen'],
      institution: 'Microsoft Research',
      arxivId: '2312.00003',
      upvotes: 856,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00003'
    },
    {
      id: 'paper-4',
      title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
      titleEs: 'El Prompting de Cadena de Pensamiento Suscita Razonamiento en LLMs',
      abstract: 'We verify that providing examples of chain of thought reasoning significantly improves the performance of large language models on complex arithmetic, commonsense, and symbolic reasoning tasks.',
      abstractEs: 'Verificamos que proporcionar ejemplos de razonamiento de cadena de pensamiento mejora significativamente el rendimiento de los grandes modelos de lenguaje en tareas complejas de aritmética, sentido común y razonamiento simbólico.',
      authors: ['Jason Wei', 'Xuezhi Wang'],
      institution: 'Google Brain',
      arxivId: '2312.00004',
      upvotes: 3201,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00004'
    },
    {
      id: 'paper-5',
      title: 'Q-Star: Bridging the Gap Between Search and Learning',
      titleEs: 'Q-Star: Puenteando la Brecha Entre Búsqueda y Aprendizaje',
      abstract: 'Q* represents a new paradigm in AI that combines the generative capabilities of LLMs with the strategic planning of search algorithms like A*, aiming for AGI-level problem solving.',
      abstractEs: 'Q* representa un nuevo paradigma en IA que combina las capacidades generativas de los LLMs con la planificación estratégica de algoritmos de búsqueda como A*, apuntando a la resolución de problemas a nivel AGI.',
      authors: ['Demis Hassabis', 'Ilya Sutskever'],
      institution: 'DeepMind',
      arxivId: '2312.00005',
      upvotes: 4100,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00005'
    },
    {
      id: 'paper-6',
      title: 'Vision Transformers for Early Detection of Alzheimer\'s',
      titleEs: 'Vision Transformers para la Detección Temprana del Alzheimer',
      abstract: 'Applying specialized Vision Transformers to MRI scans to detect early biomarkers of Alzheimer\'s disease with 99% accuracy, surpassing human radiologists.',
      abstractEs: 'Aplicación de Vision Transformers especializados a escáneres de resonancia magnética para detectar biomarcadores tempranos de la enfermedad de Alzheimer con un 99% de precisión, superando a los radiólogos humanos.',
      authors: ['Fei-Fei Li', 'Andrew Ng'],
      institution: 'Stanford University',
      arxivId: '2312.00006',
      upvotes: 1205,
      publishedAt: new Date(dateStr),
      fetchedAt: new Date(),
      url: 'https://huggingface.co/papers/2312.00006'
    }
  ];

  return NextResponse.json({
    papers: mockPapers,
    date: dateStr,
    count: mockPapers.length
  });
}
