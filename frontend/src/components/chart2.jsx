// src/components/ChartView.jsx
import { useEffect, useRef } from "react";
// import { io } from "socket.io-client";

// const socket = io("http://localhost:3001");

export default function App() {
  const chartContainerRef = useRef();
  const widgetRef = useRef(null);

  useEffect(() => {
    const loadScript = async () => {
      const tvScript = document.createElement("script");
      tvScript.src = "/charting_library/charting_library.standalone.js";
      tvScript.onload = () => initWidget();
      document.head.appendChild(tvScript);
    };

    const safeToLowerCase = (val) => {
      if (typeof val === "string") return val.toLowerCase();
      if (val && typeof val.toString === "function") return val.toString().toLowerCase();
      return "";
    };

    const initWidget = () => {
      const widget = new window.TradingView.widget({
        symbol: "XAU/USD",
        interval: "1",
        container: chartContainerRef.current,
        library_path: "/charting_library/",
        locale: "en",
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: ["study_templates"],
        autosize: true,
        theme: "light",
        datafeed: new window.Datafeeds.UDFCompatibleDatafeed(
          'http://localhost:3001'
        ),
        custom_css_url: "/charting_library/custom.css",
        overrides: {},
      });

      widgetRef.current = widget;

      // Load historical markers from backend
      widget.onChartReady(() => {
        console.log('widget.chart()',widget.chart())
        widget.chart().onIntervalChanged().subscribe(null, () => {
          // Optional: handle interval changes
        });

        // ✅ Fetch historical trade markers
        widget.chart().onDataLoaded().subscribe(null, async () => {
          const visibleRange = widget.chart().getVisibleRange();
          // Defensive: ensure visibleRange is defined and has from/to
          const from = visibleRange && typeof visibleRange.from !== "undefined" ? visibleRange.from : 0;
          const to = visibleRange && typeof visibleRange.to !== "undefined" ? visibleRange.to : 0;
          let symbol = widget.symbol && typeof widget.symbol === "function" ? widget.symbol() : "XAU/USD";
          // Defensive: ensure symbol is string
          symbol = symbol || "XAU/USD";
          const url = `http://localhost:3001/marks?symbol=${encodeURIComponent(symbol)}&from=${Math.floor(from)}&to=${Math.floor(to)}`;
          const res = await fetch(url);
          const markers = await res.json();
          // Defensive: ensure markers is an array
          if (Array.isArray(markers)) {
            markers.forEach((m) => {
              // Defensive: ensure m.label, m.time, m.text, m.color exist
              const label = m && m.label ? m.label : "";
              const shape = safeToLowerCase(label) === "b" ? "arrow_up" : "arrow_down";
              const time = m && typeof m.time === "number" ? m.time / 1000 : undefined;
              if (typeof time === "undefined") return;
              widget.chart().createShape({
                time,
                shape,
                text: m && m.text ? m.text : "",
                color: m && m.color ? m.color : "#000",
                label,
                overrides: {
                  color: m && m.color ? m.color : "#000",
                },
              });
            });
          }
        });

        // After 3 seconds, add a marker to the chart
        setTimeout(() => {
          if (widget.chart()) {
            widget.chart().createShape({
              // id: 1, // id is not required for createShape
              time: Math.floor(Date.now() / 1000) - 3600,
              color: "red",
              label: "B",
              text: "buy @ 3370.00",
              shape: "arrow_up",
              overrides: {
                color: "red",
              },
            });
          }
        }, 3000);

        // widget.chart().createShape( {
        //   id: 1,
        //   time: Math.floor(Date.now() / 1000) - 3600,
        //   color: "red",
        //   label: "B",
        //   tooltip: "buy @ 3383.00"
        // });
      });
    };

    loadScript();

    // return () => {
    //   socket.disconnect();
    // };
  }, []);

  // ✅ Listen to real-time markers from backend
  useEffect(() => {
    console.log("chartContainerRef",chartContainerRef)
  //   socket.on("new_trade", (marker) => {
  //     console.log("📡 Real-time trade received:", marker);
  //     if (widgetRef.current?.chart()) {
  //       widgetRef.current.chart().createShape({
  //         time: marker.time / 1000,
  //         shape: marker.label === "B" ? "arrow_up" : "arrow_down",
  //         text: marker.text,
  //         color: marker.color,
  //         label: marker.label,
  //         overrides: {
  //           color: marker.color,
  //         },
  //       });
  //     }
  //   });
  }, []);

  return <div ref={chartContainerRef} style={{ height: "100vh", width: "100%" }} />;
}