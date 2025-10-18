from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Button, Static
from textual.containers import Vertical
from textual.reactive import reactive
from ultralytics import YOLO
import os

# Get absolute path of app
APP_DIR = os.path.dirname(os.path.realpath(__file__))
DATA_YAML_PATH = os.path.join(APP_DIR, "../../../public/datasets/fruits-and-vegetables-detection/config/data.yaml")
MODEL_PATH = os.path.join(APP_DIR, "../../../public/models/yolo11n.pt")
EXPORT_DIR = os.path.join(APP_DIR, "../../../public/models")

class ConfirmTrain(Static):
    def compose(self) -> ComposeResult:
        yield Static("🚀 Do you want to train the YOLOv11 model?")
        yield Button("Yes", id="yes")
        yield Button("No", id="no")

class TrainApp(App):
    CSS_PATH = None
    BINDINGS = [("q", "quit", "Quit")]

    training_started = reactive(False)

    def compose(self) -> ComposeResult:
        yield Header()
        yield Vertical(
            ConfirmTrain(),
            id="main"
        )
        yield Footer()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "yes":
            self.training_started = True
            self.query_one("#main").update(Static("🧠 Training in progress..."))
            self.run_training()
        elif event.button.id == "no":
            self.exit("Training cancelled by user.")

    def run_training(self):
        try:
            model = YOLO(MODEL_PATH)
            model.train(data=DATA_YAML_PATH, epochs=50, imgsz=640)
            self.query_one("#main").update(Static("✅ Training complete! Exporting model..."))
            model.export(format="pt")
            self.query_one("#main").update(Static(f"🎉 Model exported to {EXPORT_DIR}/best.pt"))
        except Exception as e:
            self.query_one("#main").update(Static(f"❌ Error: {e}"))

if __name__ == "__main__":
    os.makedirs(os.path.dirname(DATA_YAML_PATH), exist_ok=True)
    # Example .yaml file creation
    if not os.path.exists(DATA_YAML_PATH):
        with open(DATA_YAML_PATH, "w") as f:
            f.write("""\
train: DATASET/IMAGES/TRAIN
val: DATASET/IMAGES/VAL
nc: 3
names: ['navel', 'blood_orange', 'mandarin']
""")
    TrainApp().run()
