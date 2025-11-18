import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Scissors, Sparkles, Wind, Coffee, Smile, Crown } from 'lucide-react';

const services = [
  {
    icon: Scissors,
    name: 'Premium Haircut',
    description: 'Expert styling tailored to your face shape and personal style.',
    duration: '45 min',
    price: '$45',
  },
  {
    icon: Wind,
    name: 'Beard Trim & Shape',
    description: 'Precision trimming and sculpting for a refined look.',
    duration: '30 min',
    price: '$30',
  },
  {
    icon: Crown,
    name: 'Signature Fade',
    description: 'Clean, sharp fades with seamless blending techniques.',
    duration: '50 min',
    price: '$50',
  },
  {
    icon: Coffee,
    name: 'Hot Towel Shave',
    description: 'Traditional straight razor shave with soothing hot towels.',
    duration: '40 min',
    price: '$40',
  },
  {
    icon: Smile,
    name: 'Facial Treatment',
    description: 'Revitalizing facial with cleansing, exfoliation, and moisturizing.',
    duration: '35 min',
    price: '$55',
  },
  {
    icon: Sparkles,
    name: 'The Imperial Package',
    description: 'Complete grooming experience: cut, beard, shave, and facial.',
    duration: '2 hrs',
    price: '$150',
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From classic cuts to modern styles, we offer premium grooming services tailored to your needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-border/50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <CardDescription className="mt-2">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center pt-4 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">{service.duration}</span>
                      <span className="text-xl" style={{ color: '#c4a460' }}>{service.price}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
