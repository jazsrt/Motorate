const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VehicleDetection {
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  confidence: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { imageData } = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");

    if (!GOOGLE_VISION_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Google Vision API not configured",
          detection: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const base64Image = imageData.split(",")[1] || imageData;

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                { type: "LABEL_DETECTION", maxResults: 20 },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                { type: "IMAGE_PROPERTIES", maxResults: 5 },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      throw new Error("Google Vision API request failed");
    }

    const visionData = await visionResponse.json();
    const annotations = visionData.responses[0];

    const detection: VehicleDetection = {
      confidence: 0,
    };

    if (annotations.labelAnnotations) {
      const labels = annotations.labelAnnotations.map(
        (label: { description: string }) => label.description.toLowerCase()
      );

      const vehicleKeywords = [
        "car",
        "vehicle",
        "automobile",
        "sedan",
        "suv",
        "truck",
        "coupe",
        "convertible",
        "hatchback",
        "wagon",
      ];
      const hasVehicle = labels.some((label: string) =>
        vehicleKeywords.some((keyword) => label.includes(keyword))
      );

      if (hasVehicle) {
        detection.confidence = 0.7;
      }

      const makePatterns = [
        "bmw",
        "mercedes",
        "audi",
        "toyota",
        "honda",
        "ford",
        "chevrolet",
        "nissan",
        "tesla",
        "porsche",
        "ferrari",
        "lamborghini",
        "volkswagen",
        "mazda",
        "subaru",
        "lexus",
      ];
      for (const make of makePatterns) {
        if (labels.some((label: string) => label.includes(make))) {
          detection.make =
            make.charAt(0).toUpperCase() + make.slice(1);
          detection.confidence = Math.max(detection.confidence, 0.8);
          break;
        }
      }
    }

    if (annotations.imagePropertiesAnnotation?.dominantColors?.colors) {
      const dominantColor =
        annotations.imagePropertiesAnnotation.dominantColors.colors[0];
      if (dominantColor) {
        const { red, green, blue } = dominantColor.color;
        detection.color = rgbToColorName(red, green, blue);
        detection.confidence = Math.max(detection.confidence, 0.6);
      }
    }

    return new Response(
      JSON.stringify({
        detection: detection.confidence > 0.5 ? detection : null,
        debug: {
          labels: annotations.labelAnnotations?.slice(0, 10),
          objects: annotations.localizedObjectAnnotations?.slice(0, 5),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in detect-vehicle function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        detection: null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function rgbToColorName(r: number, g: number, b: number): string {
  const colors: { [key: string]: [number, number, number] } = {
    Black: [0, 0, 0],
    White: [255, 255, 255],
    Red: [255, 0, 0],
    Green: [0, 128, 0],
    Blue: [0, 0, 255],
    Yellow: [255, 255, 0],
    Orange: [255, 165, 0],
    Purple: [128, 0, 128],
    Pink: [255, 192, 203],
    Brown: [165, 42, 42],
    Gray: [128, 128, 128],
    Silver: [192, 192, 192],
    Gold: [255, 215, 0],
    Beige: [245, 245, 220],
  };

  let closestColor = "Unknown";
  let minDistance = Infinity;

  for (const [name, [cr, cg, cb]] of Object.entries(colors)) {
    const distance = Math.sqrt(
      Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = name;
    }
  }

  return closestColor;
}
