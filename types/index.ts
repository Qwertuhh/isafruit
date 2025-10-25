type Config = {
  yolo: {
    data: {
      train: string;
      val: string;
      test: string;
      names: string[];
      nc: number;
    };
  };
};


interface DataYamlConfig {
  train: string;
  val: string;
  nc: number;
  names: string[];
}

export type { Config, DataYamlConfig };
