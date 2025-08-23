import { Canvas } from "@react-three/fiber";
import { Planet } from "../components/Planet";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { useMediaQuery } from "react-responsive";
import AnimatedHeaderSection from "../components/AnimatedHeaderSection";
const Hero = () => {
  const isMobile = useMediaQuery({ maxWidth: 853 });
 const text = `I build fast, scalable, and robust apps —
from slick frontends to rock-solid backends.
Code, cloud, and a bit of magic in between.`;

  return (
    <section id="home" className="flex flex-col justify-end min-h-screen">
      <AnimatedHeaderSection
        subTitle={"Ft"}
        title={"SHESHI "}
        text={text}
        textColor={"text-black"}
      />
      <figure
        className="absolute inset-0 -z-50"
        style={{ width: "100vw", height: "100vh" }}
      >
        
      </figure>
    </section>
  );
};

export default Hero;
