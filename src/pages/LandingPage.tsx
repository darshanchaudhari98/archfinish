import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Upload,
  Brain,
  FileSpreadsheet,
  DoorOpen,
  ScanText,
  Layers,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  BarChart3,
  Palette,
  Download,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-blueprint.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: Upload,
    title: "Smart Upload",
    desc: "Drag & drop architectural floor plans in any image format. Supports PNG, JPG, WEBP, TIFF, and BMP.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Brain,
    title: "AI Room Detection",
    desc: "Advanced vision AI automatically identifies every room, reading labels, dimensions, and spatial relationships.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: ScanText,
    title: "OCR Text Extraction",
    desc: "Reads all annotations, dimension labels, and text notes embedded in your architectural drawings.",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Palette,
    title: "Auto Finish Suggestions",
    desc: "AI recommends appropriate wall, floor, and ceiling finishes based on room type and architectural standards.",
    color: "bg-success/10 text-success",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel & PDF Export",
    desc: "Generate professional Schedule of Finishes documents in both Excel and PDF formats with one click.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: DoorOpen,
    title: "Inline Room Editing",
    desc: "Edit any room detail directly in the schedule table — finishes, colors, dimensions, skirting, dado, and more.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Layers,
    title: "Project Organization",
    desc: "Organize drawings into projects. Keep residential, commercial, and renovation work neatly separated.",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    desc: "Enterprise-grade encryption. Your drawings and data stay private with row-level security policies.",
    color: "bg-success/10 text-success",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Upload Your Drawing",
    desc: "Drop any architectural floor plan image into the uploader. Our system handles all common formats.",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI Analyzes Instantly",
    desc: "Our vision AI scans the drawing, detects rooms, reads text, and extracts dimensional data in seconds.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Review & Refine",
    desc: "Check the extracted schedule, edit finishes inline, and adjust any room details to match your specs.",
    icon: BarChart3,
  },
  {
    step: "04",
    title: "Export & Share",
    desc: "Download your polished Schedule of Finishes as a professional Excel spreadsheet or PDF document.",
    icon: Download,
  },
];

const stats = [
  { value: "10x", label: "Faster than manual" },
  { value: "95%", label: "Detection accuracy" },
  { value: "50+", label: "Room types supported" },
  { value: "2 min", label: "Average analysis time" },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Principal Architect, StudioArch",
    quote: "ArchFinish cut our schedule of finishes preparation from hours to minutes. The AI detection is remarkably accurate.",
    rating: 5,
  },
  {
    name: "James Chen",
    role: "Interior Designer, ModernSpace",
    quote: "The finish suggestions are spot-on for residential projects. It's like having a junior designer who never gets tired.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Project Manager, BuildCraft",
    quote: "We process 20+ drawings per week now. The Excel exports integrate perfectly with our existing workflows.",
    rating: 5,
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold font-heading text-foreground">ArchFinish</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm">
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground text-sm gap-1.5">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 blueprint-grid opacity-30" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />

        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              className="max-w-xl"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AI-Powered Architecture Tool</span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading text-foreground leading-tight">
                From Blueprint to{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                  Schedule of Finishes
                </span>{" "}
                in Minutes
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Upload architectural drawings and let AI extract every room, detect dimensions, suggest finishes,
                and generate professional schedules — automatically.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-4">
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="gradient-primary text-primary-foreground text-base px-8 gap-2 shadow-glow hover:shadow-lg transition-shadow"
                >
                  Start Free <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  See How it Works
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-8 flex items-center gap-6">
                {[
                  "No credit card required",
                  "Free tier available",
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border/50">
                <img
                  src={heroImage}
                  alt="Architectural blueprint with digital analysis"
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
              </div>
              {/* Floating cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-4 -left-4 rounded-xl bg-card border border-border shadow-elevated p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <DoorOpen className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">12 Rooms Detected</p>
                    <p className="text-xs text-muted-foreground">Analysis complete</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="absolute -top-4 -right-4 rounded-xl bg-card border border-border shadow-elevated p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Export Ready</p>
                    <p className="text-xs text-muted-foreground">Excel & PDF</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-bold font-heading bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 mb-4">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-accent">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-foreground">
              Everything You Need to Automate Finishes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From intelligent room detection to professional exports, ArchFinish handles the entire workflow.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-110 duration-300`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold font-heading text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30 border-y border-border">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-4">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Simple Workflow</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Four simple steps to transform your drawings into professional documentation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-px border-t-2 border-dashed border-border -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-4">
                    <item.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">Step {item.step}</span>
                  <h3 className="mt-2 text-lg font-semibold font-heading text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/5 px-4 py-1.5 mb-4">
              <Users className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-medium text-warning">Loved by Professionals</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-foreground">
              Trusted by Architects Worldwide
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden gradient-dark blueprint-grid p-12 lg:p-16 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold font-heading text-primary-foreground">
                Ready to Transform Your Workflow?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/70 max-w-xl mx-auto">
                Join hundreds of architects and designers who save hours every week with AI-powered drawing analysis.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 text-base px-8 gap-2"
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-6 flex justify-center items-center gap-6">
                {["No credit card needed", "Free tier forever", "Cancel anytime"].map((text) => (
                  <div key={text} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-primary-foreground/70">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold font-heading text-foreground">ArchFinish</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ArchFinish. AI-powered architectural analysis.
          </p>
        </div>
      </footer>
    </div>
  );
}
