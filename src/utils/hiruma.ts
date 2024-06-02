export type Image = {
  image: string;    // url
  offset_x: number; // [0-1]
  offset_y: number; // [0-1]
  scale_x: number;  // imageの物理座標の係数？
  scale_y: number;  // imageの物理座標の係数？
};

export type Quote = {
  position_x_rough: "left" | "center" | "right";
  position_y_rough: "top" | "center" | "bottom";
  text: string;
  position_x: number; // ?
  position_y: number; // ?
  font_path: string;
  size_multiplier: number; // ?
  txt_size: number; // ?
  text_color: string;
  bubble_color: string;
  bubble_padding: number; // px?
  bubble_border_width: number; // px?
  bubble_border_color: string;
  bubble_outline_width: number; // px?
  is_vertical: boolean; // 縦読みのbool?
  z_index: number;
  stick_angle: number; // 尻尾？ deg?
  speaker_x: number; // なんの値？
  speaker_y: number; // なんの値？
  style: "normal" | "narration";
  quote_overview: string;
};

export type Onomatopoeia = {
  source: string;
  character_id: string;
  size_multiplier: number; // なんの係数? 
  text: string;
  position_x_rough: "left" | "center" | "right";
  position_y_rough: "top" | "center" | "bottom";
  position_x: number; // 親座標系は何？
  position_y: number; // 親座標系は何？
  text_size: number; // px?
  text_color: string;
  outline_color: string;
  outline_width: number; // px?
  text_angle: number; // deg?
  is_vertical: boolean; // 縦読みのbool?
  font_path: string;
  z_index: number;
  style: "normal" | "italic" | "bold" | "bold italic"; // とか？
  onomatopoeia_overview: string;
};

export type Col ={
  col_num: number;
  panel_index: number;
  panel_overview: string;
  width_ratio: number;
  image: Image;
  quotes: Quote[];
  onomatopoeia: Onomatopoeia[];
  right_protrude: number; // なんの値？
  left_protrude: number; // なんの値？
  top_protrude: number; // なんの値？
  bottom_protrude: number; // なんの値？
}

export type Row = {
  row_num: number;
  height_ratio: number;
  cols: Col[];
  right_protrude: number; // なんの値？
  left_protrude: number; // なんの値？
  top_protrude: number; // なんの値？
  bottom_protrude: number; // なんの値？
}

export type Page = {
  rows: Row[];
  page_num: number;
  page_width: number; // px?
  page_height: number; // px?
  background_color: string;
  vertical_span: number; // なんの値？
  horizontal_span: number; // なんの値？
  padding: number; // px? なんの値？
  border_width: number; // px?
  border_color: string;
  style_ref_urls: string;
}

export type Storyboard = {
  pages: Page[];
}
