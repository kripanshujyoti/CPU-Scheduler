CXX      := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Wextra
TARGET   := cpu_scheduler
SRC      := src/main.cpp

.PHONY: all run clean

all: $(TARGET)

$(TARGET): $(SRC) src/*.h
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRC)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
